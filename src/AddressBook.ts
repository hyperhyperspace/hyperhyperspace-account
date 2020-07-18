import { Hash, HashedObject, MutableSet, Endpoint, LinkupManager, HashedSet, Identity } from 'hyper-hyper-space';
import { PeerSource, GenericPeerSource } from 'hyper-hyper-space';
import { Account } from './Account';
import { Contact } from './Contact';
import { Device } from './Device';
import { Invite } from './Invite';
import { ContactNegotiation } from './ContactNegotiation';


class AddressBook extends HashedObject {

    
    account?: Account;

    ownDevices? : MutableSet<Device>;
    ownContact? : Contact;
    contacts?: MutableSet<Contact>;
    invites?: MutableSet<ContactNegotiation>;

    // transient variables
    _perContactPeerSource : Map<Hash, PeerSource>;
    _doSync = false;

    constructor(account?: Account) {
        super();

        if (account !== undefined) {
            this.account = account;
            this.ownDevices = this.account.devices.clone();
            this.addDerivedField('contacts', new MutableSet<Contact>());
            this.addDerivedField('invites', new MutableSet<Invite>());

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
            let peerSource: PeerSource =  this.createPeerSetWithContact(contact);
            this.getMesh().joinPeerGroup(this.contactPeerGroupId(contact.identity.hash()),
                                         this.account._localDevice.asPeer(LinkupManager.defaultLinkupServer),
                                         peerSource);
        });

        this.contacts.onDeletion((contact: Contact) => {
            // TODO
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

    private createPeerSetWithContact(contact: Contact) {
        return new GenericPeerSource(
            async () => {
                let ownDevicePeers = Array.from(this.ownDevices.values())
                                          .map((d: Device) => 
                                                    d.asPeer(LinkupManager.defaultLinkupServer));
                let contactDevicePeers = Array.from(contact.devices.values())
                                              .map((d: Device) => 
                                              d.asPeer(LinkupManager.defaultLinkupServer));
                
                let allPeers = [];
                
                for (let i=0; i<Math.max(ownDevicePeers.length, contactDevicePeers.length); i++) {
                    if (i<ownDevicePeers.length) {
                        allPeers.push(ownDevicePeers[i]);
                    }
                    if (i<contactDevicePeers.length) {
                        allPeers.push(contactDevicePeers[i]);
                    }
                }

                return allPeers;
            },
            async (ep: Endpoint) => {

                let hash = Device.deviceHashFromEndpoint(ep);

                try {
                    let device = this.ownDevices?.get(hash);
                    if (device !== undefined) {
                        return device.asPeer(LinkupManager.defaultLinkupServer);
                    }
                } catch (e) {
                    // log!
                }

                try {
                    let device = contact.devices?.get(hash);
                    if (device !== undefined) {
                        return device.asPeer(LinkupManager.defaultLinkupServer);
                    }
                } catch (e) {
                    // log!
                }

                return undefined;
            }
        );
    }

    private initContactSyncService(contact: Contact) {
        
    }

}