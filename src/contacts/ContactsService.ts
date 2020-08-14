import { Hash, Resources, Identity, MutableSet} from 'hyper-hyper-space';

import { AccountService } from '../account/AccountService';
import { AccountDevices } from '../account/peers/AccountDevices';

import { ContactsInfo } from './shared/ContactsInfo';
import { ContactPairDevices } from './peers/ContactPairDevices';
import { AccountDevicesInfo } from 'account/shared/AccountDevicesInfo';

class ContactsService {


    ownAccountService: AccountService;

    contactsInfo: ContactsInfo;

    allContactPairDevices: Map<Hash, ContactPairDevices>;

    started = false;

    constructor(ownAccountService: AccountService) {
        this.ownAccountService = ownAccountService;

        this.contactsInfo = new ContactsInfo(this.ownAccountService.ownerIdentityHash);

        this.allContactPairDevices = new Map();
    }

    async init(resources: Resources) {

        this.contactsInfo.init(resources);

        for (const mut of this.contactsInfo.getAllObjects()) {
            await mut.loadAndWatchForChanges();
        }

        const onNewContact = (contactIdentity: Identity) => {
            this.initContactPairDevices(contactIdentity.hash());
            if (this.started) { 
                this.connectContactPairDevices(contactIdentity.hash());
            }
        };

        this.contactsInfo?.contacts?.onAddition(onNewContact);
       
        const contacts = this.contactsInfo.contacts as MutableSet<Identity>;

        for (const contactIdentity of contacts.values()) {
            onNewContact(contactIdentity);
        }

    }

    start() {
        if (!this.started) {
            for (const contactIdentityHash of this.allContactPairDevices.keys()) {
                this.connectContactPairDevices(contactIdentityHash);
            }
            this.started = true;
        }
    }

    initContactPairDevices(contactIdentityHash: Hash) {
        
        if (!this.allContactPairDevices.has(contactIdentityHash)) {
            const accountDevices = this.ownAccountService.accountDevices as AccountDevices        
            const contactPairDevices = new ContactPairDevices(accountDevices, contactIdentityHash);
            this.allContactPairDevices.set(contactIdentityHash, contactPairDevices);
        }
    }

    // All the called functions are idenmpotent, so this one is idempotent as well.
    connectContactPairDevices(contactIdentityHash: Hash) {

        const contactPairDevices = 
                this.allContactPairDevices.get(contactIdentityHash) as ContactPairDevices;
        
        contactPairDevices.connect();
        contactPairDevices.addSyncTarget(this.ownAccountService?.accountDevices?.deviceInfo as AccountDevicesInfo);
        contactPairDevices.addSyncTarget(contactPairDevices.contactAccountDevices?.deviceInfo as AccountDevicesInfo);

    }

    createInvite(recipient: string) {
        recipient;
    }


}

export { ContactsService };