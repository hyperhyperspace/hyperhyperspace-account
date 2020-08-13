import { Hash, Resources, Identity } from "hyper-hyper-space";
import { AccountService } from "../account/AccountService";
import { ContactsInfo } from "./shared/ContactsInfo";
import { ContactPairDevices } from "./peers/ContactPairDevices";
import { AccountDevices } from "../account/peers/AccountDevices";


class ContactsService {


    ownAccountService: AccountService;

    contactsInfo: ContactsInfo;

    allContactPairDevices: Map<Hash, ContactPairDevices>;

    started = false;

    constructor(ownAccountService: AccountService) {
        this.ownAccountService = ownAccountService;

        this.contactsInfo = new ContactsInfo(this.ownAccountService.ownerIdentityHash);
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

        this.contactsInfo.contacts.onAddition(onNewContact);
       
        for (const contactIdentity of this.contactsInfo.contacts.values()) {
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
        contactPairDevices.addSyncTarget(this.ownAccountService.accountDevices.deviceInfo);
        contactPairDevices.addSyncTarget(contactPairDevices.contactAccountDevices.deviceInfo);

    }


}