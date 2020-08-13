import { Resources, MutableObject, Hash, Namespace, MutableSet, Identity } from 'hyper-hyper-space';

import { SharedNamespace } from '../../sync/SharedNamespace';

import { Invite } from '../data/Invite';
import { InviteToken } from '../data/InviteToken';


class ContactsInfo implements SharedNamespace {

    ownerIdentityHash: Hash;

    namespace: Namespace;

    contacts?: MutableSet<Identity>;

    sentInvites?: MutableSet<Invite>;

    receivedInviteTokens?: MutableSet<InviteToken>;
    acceptedInviteTokens?: MutableSet<InviteToken>;

    constructor(ownerIdentityHash: Hash) {
        this.ownerIdentityHash = ownerIdentityHash;

        this.namespace = new Namespace('contacts-for-' + this.ownerIdentityHash);
    }

    id(): string {
        return this.namespace.id;
    }

    async init(resources: Resources) {

        let owner = await resources.store.load(this.ownerIdentityHash) as Identity | undefined;

        if (owner === undefined) {
            throw new Error('Cannot initialize contacts shared namespace, owner identity is not present in the store!');
        }

        this.contacts = new MutableSet<Identity>();
        this.contacts.setAuthor(owner);
        this.contacts.setResources(resources);
        this.namespace.define('contacts', this.contacts);

        this.sentInvites = new MutableSet<Invite>();
        this.sentInvites.setAuthor(owner);
        this.sentInvites.setResources(resources);
        this.namespace.define('sentInvites', this.sentInvites);


        this.receivedInviteTokens = new MutableSet<InviteToken>();
        this.receivedInviteTokens.setAuthor(owner);
        this.receivedInviteTokens.setResources(resources);
        this.namespace.define('receivedInviteTokens', this.receivedInviteTokens);

        this.acceptedInviteTokens = new MutableSet<InviteToken>();
        this.acceptedInviteTokens.setAuthor(owner);
        this.acceptedInviteTokens.setResources(resources);
        this.namespace.define('acceptedInviteTokens', this.acceptedInviteTokens);

    }

    get(name: string): MutableObject {
        return this.namespace?.get(name);
    }

    getAllObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    getContacts(): MutableSet<Identity> {
        if (this.contacts === undefined) {
            throw new Error('ContactsInfo has not been initialized: contacts is undefined');
        } else {
            return this.contacts;
        }
    }

    getSentInvites(): MutableSet<Invite> {
        if (this.sentInvites === undefined) {
            throw new Error('ContactsInfo has not been initialized: sentInvites is undefined');
        } else {
            return this.sentInvites;
        }
    }

    getReceivedInviteTokens(): MutableSet<InviteToken> {
        if (this.receivedInviteTokens === undefined) {
            throw new Error('ContactsInfo has not been initialized: receivedInviteTokens is undefined');
        } else {
            return this.receivedInviteTokens;
        }
    }

    getAcceptedInviteTokens(): MutableSet<InviteToken> {
        if (this.acceptedInviteTokens === undefined) {
            throw new Error('ContactsInfo has not been initialized: receivedInviteTokens is undefined');
        } else {
            return this.acceptedInviteTokens;
        }
    }

}

export { ContactsInfo }