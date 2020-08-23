import { Resources, MutableSet, Identity, HashedObject } from 'hhs';

import { Invite } from '../model/Invite';
import { InviteToken } from '../model/InviteToken';


class Contacts extends HashedObject {

    static className = 'hhs-home/v0/Contacts';

    owner?: Identity;

    contacts?: MutableSet<Identity>;
    sentInvites?: MutableSet<Invite>;

    receivedInviteTokens?: MutableSet<InviteToken>;
    acceptedInviteTokens?: MutableSet<InviteToken>;

    constructor(owner?: Identity) {
        super();

        if (owner !== undefined) {
            this.owner = owner;

            this.setId('contacts-for-' + this.owner.hash());
        
            const contacts = new MutableSet<Identity>();
            contacts.setAuthor(owner);
            this.addDerivedField('contacts', contacts);

            const sentInvites = new MutableSet<Invite>();
            sentInvites.setAuthor(owner);
            this.addDerivedField('sentInvites', sentInvites);

            const receivedInviteTokens = new MutableSet<InviteToken>();
            receivedInviteTokens.setAuthor(owner);
            this.addDerivedField('receivedInviteTokens', receivedInviteTokens);

            const acceptedInviteTokens = new MutableSet<InviteToken>();
            acceptedInviteTokens.setAuthor(owner);
            this.addDerivedField('acceptedInviteTokens', acceptedInviteTokens);
        }
    }

    getClassName(): string {
        return Contacts.className;
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        references;

        return this.owner !== undefined &&
               this.contacts !== undefined &&
               this.sentInvites !== undefined &&
               this.receivedInviteTokens !== undefined &&
               this.acceptedInviteTokens !== undefined &&
               this.owner instanceof Identity &&
               this.sentInvites instanceof MutableSet &&
               this.contacts instanceof MutableSet &&
               this.receivedInviteTokens instanceof MutableSet &&
               this.acceptedInviteTokens instanceof MutableSet &&
               this.owner.equals(this.contacts?.getAuthor()) &&
               this.owner.equals(this.sentInvites?.getAuthor()) &&
               this.owner.equals(this.receivedInviteTokens?.getAuthor()) &&
               this.owner.equals(this.acceptedInviteTokens?.getAuthor()) &&
               this.checkDerivedField('contacts') &&
               this.checkDerivedField('sentInvites') &&
               this.checkDerivedField('receivedInviteTokens') &&
               this.checkDerivedField('acceptedInviteTokens');
    }


    setResources(resources: Resources) {
        super.setResources(resources);

        this.contacts?.setResources(resources);
        this.sentInvites?.setResources(resources);
        this.receivedInviteTokens?.setResources(resources);
        this.acceptedInviteTokens?.setResources(resources);
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

HashedObject.registerClass(Contacts.className, Contacts);

export { Contacts }