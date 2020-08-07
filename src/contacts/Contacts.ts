import { MutableSet, Hash, Identity, Namespace, Resources, MutableObject } from 'hyper-hyper-space';

import { AccountDevices } from '../account/AccountDevices';

import { ContactPairDevices } from './ContactPairDevices';
import { SyncTarget } from '../sync/SyncTarget';


class Contacts implements SyncTarget {

    ownAccountDevices: AccountDevices;
    allContactPairDevices: Map<Hash, ContactPairDevices>;

    resources?: Resources;

    namespace?: Namespace;
    contacts?: MutableSet<Identity>

    constructor(accountDevices: AccountDevices) {
        this.ownAccountDevices = accountDevices;
        this.allContactPairDevices = new Map();
    }

    async init(resources: Resources) {

        if (resources === undefined) {
            this.resources = resources;

            this.namespace = new Namespace('hhs-home-contacts-for-' + this.ownAccountDevices.ownerIdentityHash);

            this.contacts = new MutableSet<Identity>();
            this.contacts.setAuthor(this.ownAccountDevices.owner);
            this.namespace.define('contacts', this.contacts);
            this.contacts.setResources(resources);

            this.ownAccountDevices.addSyncTarget(this);
        }
    }

    getRootObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    async loadAndWatchForChanges() {
        await this.contacts.loadAndWatchForChanges();
    }

    async loadAndSync() {
        await this.contacts.loadAllChanges();

        this.contacts.onAddition((id: Identity) => {
            this.syncWithContact(id);
        });

        this.contacts.onDeletion((id: Identity) => {
            // TODO !
        });

        for (const id of this.contacts.values()) {
            this.syncWithContact(id);
        }
    }

    private syncWithContact(id: Identity) {

        if (!this.allContactPairDevices.has(id.hash())) {
            let contactPairDevices = new ContactPairDevices(this.ownAccountDevices, id.hash());
            contactPairDevices.init(this.resources);
            this.allContactPairDevices.set(id.hash(), contactPairDevices);
            contactPairDevices.loadAndSync();
        }
    }

    async joinContactPeerGroups() {
        this.contacts.onAddition((contact: Identity) => {

        }); 
    }

    getContactPairDevices(identityHash: Hash) : ContactPairDevices | undefined {
        return this.allContactPairDevices.get(identityHash);
    }

}