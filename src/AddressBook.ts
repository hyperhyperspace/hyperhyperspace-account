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
    _createContactSyncGroup : (contact: Contact) => void;
    _createInviteSyncGroup  : (invite: Invite, sender: boolean) => void;
    
    _perContactPeerSource : Map<Hash, PeerSource>;
    _perInvitePeerSource  : Map<Hash, PeerSource>;
    _doSync = false;


    constructor(account?: Account) {
        super();

        if (account !== undefined) {
            this.account = account;
            this.ownDevices = this.account.devices.clone();
            this.addDerivedField('contacts', new MutableSet<Contact>());
            this.addDerivedField('sentInvites', new MutableSet<PendingInvite>());
            this.addDerivedField('receivedInvites', new MutableSet<Invite>());

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


        this._createContactSyncGroup = (contact: Contact) => {

            // Configure a peer group using the local mesh that has all of this
            // account devices and our contact's devices as peers, if it hasn't
            // been donde already.

            let h = contact.hash();

            if (!this._perContactPeerSource.has(h)) {

                let peerSource: PeerSource =  this.createPeerGroupWithContact(contact);

                this.getMesh().joinPeerGroup(this.contactPeerGroupId(contact.identity.hash()),
                                             this.account._localDevice.asPeer(LinkupManager.defaultLinkupServer),
                                             peerSource);

                this._perContactPeerSource.set(h, peerSource);
                    
            }
        }

        this._createInviteSyncGroup = (invite: Invite, sender: boolean) => {

            let h = invite.hash();

            if (!this._perInvitePeerSource.has(h)) {

                let peerSource = this.createInvitePeerGroup(invite, sender);

                let localPeer = sender? 
                    this.account._localDevice.asPeer(LinkupManager.defaultLinkupServer) :
                    invite.receiverPeer(this.account.identity.hash(), LinkupManager.defaultLinkupServer);

                this.getMesh().joinPeerGroup(this.invitePeerGroupId(invite),
                                             localPeer,
                                             peerSource);

                this.getMesh().syncObjectWithPeerGroup(this.invitePeerGroupId(invite),
                                                       invite.reply,
                                                       false);
                
                this._perInvitePeerSource.set(h, peerSource);
            }

        }
    }

    async start() {

        // Ask the Account instance to sync the AddressBook copy in the local store  
        // with all the other account devices (so, when we save any changes to the store,
        // they will make their way there eventually).
        this.account.syncObjectWithAccountDevices(this);

        // Keep our copy of the account devices up to date with the local store.
        // (The Account instance will keep our copy in the store in sync.) 
        await this.ownDevices.loadAndWatchForChanges();

        // Load all contacts, create a peer group for each contact using the local mesh
        // so we can sync stuff with them privately, and keep it in sync with any changes
        // in the local store to the contacts set.

        await this.contacts.loadAllChanges();

        for (const contact of this.contacts.values()) {
            this._createContactSyncGroup(contact);
        }

        this.contacts.onAddition(this._createContactSyncGroup);
        this.contacts.onDeletion((contact: Contact) => {
            // TODO: tear down sync group, but leavePeerGroup does not exist yet.
            // this.getMesh().leavePeerGroup(this.contactPeerGroupId(contact.identity.hash()));
        });

        this.contacts.watchForChanges(true);


        // Also create sync groups for sent invites.
        await this.sentInvites.loadAllChanges();
        
        for (const pendingInvite of this.sentInvites.values()) {
            this._createInviteSyncGroup(pendingInvite.invite, true);
        }

        // Do the same for received invites (they are _slightly_ different, since
        // the receiver of the invite doesn't need the special case for the accepting
        // device endpoint, for which we don't know anything and authenticate using 
        // the invite secret)
        this.sentInvites.onAddition((pi: PendingInvite) => { this._createInviteSyncGroup(pi.invite, true) });
        this.sentInvites.onDeletion((pi: PendingInvite) => { pi; /* TODO: tear down sync group */ });

        this.sentInvites.watchForChanges(true);

        await this.receivedInvites.loadAllChanges();

        for (const invite of this.receivedInvites.values()) {
            this._createInviteSyncGroup(invite, false);
        }

        this.receivedInvites.onAddition((i: Invite) => { this._createInviteSyncGroup(i, false)});
        this.receivedInvites.onDeletion((i: Invite) => { i; /* TODO: tear down sync group */});

        this.receivedInvites.watchForChanges(true);
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

    private invitePeerGroupId(invite: Invite) {
        return 'hhs-home-contact-invite-' + invite.getId();
    }

    private createInvitePeerGroup(invite: Invite, sender: boolean) {

        let receiverPeerForEndpoint = sender? 
            (ep: Endpoint) => invite.receiverPeerForEndpoint(ep) :
            undefined;

        return new GenericPeerSource<HashedLiteral>(
            (d: HashedLiteral) => invite.senderDevicePeer(d, LinkupManager.defaultLinkupServer),
            (ep: Endpoint) => invite.senderDeviceHashForEndpoint(ep),
            [invite.senderDevicesMap()],
            receiverPeerForEndpoint
        );
    }

}