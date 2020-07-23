import { Hash, HashedObject, MutableSet, Endpoint, LinkupManager, HashedSet, Identity, HashedLiteral, PeerGroupAgent } from 'hyper-hyper-space';
import { PeerSource, GenericPeerSource } from 'hyper-hyper-space';
import { Account } from './Account';
import { Contact } from './Contact';
import { Device } from './Device';
import { Invite } from './Invite';
import { PendingInvite } from './PendingInvite';


class AddressBook extends HashedObject {

    
    account?    : Account;
    ownDevices? : MutableSet<Device>;

    ownContact? : Contact;
    contacts?   : MutableSet<Contact>;

    sentInvites?     : MutableSet<PendingInvite>;
    receivedInvites? : MutableSet<Invite>

    // transient variables
    _perContactPeerSource : Map<Hash, PeerSource>;
    _perInvitePeerSource  : Map<Hash, PeerSource>;
    _doSync = false;

    constructor(account?: Account) {
        super();

        if (account !== undefined) {
            this.account = account;
            this.ownDevices = this.account.devices.clone();
            this.addDerivedField('contacts', new MutableSet<Contact>());
            this.addDerivedField('sentInvites', new MutableSet<Invite>());

            this._perContactPeerSource = new Map();
            this._perInvitePeerSource  = new Map();

            this.init();
        }
    }

    getClassName(): string {
        throw new Error("Method not implemented.");
    }
    
    validate(references: Map<string, HashedObject>): boolean {
        throw new Error("Method not implemented.");
    }

    init() {

        this.contacts.onAddition((contact: Contact) => {
            let peerSource: PeerSource =  this.createPeerGroupWithContact(contact);
            this.getMesh().joinPeerGroup(this.contactPeerGroupId(contact.identity.hash()),
                                         this.account._localDevice.asPeer(LinkupManager.defaultLinkupServer),
                                         peerSource);
        });

        this.contacts.onDeletion((contact: Contact) => {
            // TODO: leavePeerGroup does not exist yet.
            // this.getMesh().leavePeerGroup(this.contactPeerGroupId(contact.identity.hash()));
        });

        

    }

    start() {
        this.ownDevices.loadAndWatchForChanges();
        this.account.syncObjectWithAccountDevices(this);
    }

    stop() {
        //this.doSync = false;
        //this.account.devices().stopSync(this);
    }

    syncWithContact(identityHash: Hash, object: HashedObject, recursive=true, gossipId?: string) {
        this.getMesh().syncObjectWithPeerGroup(this.contactPeerGroupId(identityHash), object, recursive, gossipId);
    }

    private contactPeerGroupId(contactIdHash: Hash) {
        let ids = new HashedSet([contactIdHash, this.account.identity?.hash()].values());

        return 'hhs-home-' + ids.hash() + '-contact-pair';
    }

    private createPeerGroupWithContact(contact: Contact) {

        return new GenericPeerSource<Device>(
            (d: Device) => d.asPeer(LinkupManager.defaultLinkupServer),
            (ep: Endpoint) => Device.deviceHashFromEndpoint(ep),
            [this.ownDevices, contact.devices]
        );
    }

    private sentInvitePeerGroupId(invite: Invite) {
        return 'hhs-home-contact-invite-' + invite.getId();
    }

    private createSentInvitePeerGroup(invite: Invite) {

        let deviceHashes: Map<Hash, HashedLiteral> = invite.devices();

        return new GenericPeerSource<HashedLiteral>(
            (d: HashedLiteral) => { },
            (ep: Endpoint) => Device.deviceHashFromEndpoint(ep),
            [deviceHashes]
        );
    }

}