import { MutableSet, Hash, Identity, Namespace, Resources, MutableObject } from 'hyper-hyper-space';

import { AccountDevices } from '../account/AccountDevices';

import { ContactPairDevices } from './ContactPairDevices';
import { SyncTarget } from '../sync/SharedNamespace';
import { Invite } from './Invite';
import { InviteToken } from './InviteToken';
import { PendingInviteDevices } from './PendingInviteDevices';
import { InviteReply } from './InviteReply';

enum ContactsEventType {
    
    NewInviteSent     = 'new-invite-sent',
    NewInviteReceived = 'new-invite-received',
    NewInviteAccepted = 'new-invite-accepted',
    NewContact        = 'new-contact'
};

type ContactsEvent = NewContactEvent | NewInviteSentEvent | NewInviteReceivedEvent;

type NewInviteSentEvent = {
    type: ContactsEventType.NewInviteSent,
    invite: Invite
}

type NewInviteReceivedEvent = {
    type: ContactsEventType.NewInviteReceived,
    inviteToken: InviteToken
}

type NewInviteAcceptedEvent = {
    type: ContactsEventType.NewInviteAccepted,
    inviteToken: InviteToken,
    inviteReply: InviteReply
}

type NewContactEvent = {
    type: ContactsEventType.NewContact,
    Identity: Identity
}

class Contacts implements SyncTarget {

    ownAccountDevices: AccountDevices;
    allContactPairDevices: Map<Hash, ContactPairDevices>;

    resources?: Resources;

    namespace?: Namespace;
    contacts?: MutableSet<Identity>;

    sentInvites: MutableSet<Invite>;
    pendingSentInviteDevices: Map<Hash, PendingInviteDevices>;
    
    receivedInviteTokens: MutableSet<InviteToken>;

    acceptedInviteTokens: MutableSet<InviteToken>;
    pendingAcceptedInviteDevices: Map<Hash, PendingInviteDevices>;

    constructor(accountDevices: AccountDevices) {
        this.ownAccountDevices = accountDevices;
        this.allContactPairDevices = new Map();
        this.pendingSentInviteDevices = new Map();
        this.pendingAcceptedInviteDevices = new Map();
    }

    async init(resources: Resources) {

        if (resources === undefined) {
            this.resources = resources;

            this.namespace = new Namespace('hhs-home-contacts-for-' + this.ownAccountDevices.ownerIdentityHash);

            this.contacts = new MutableSet<Identity>();
            this.contacts.setAuthor(this.ownAccountDevices.owner);
            this.namespace.define('contacts', this.contacts);
            this.contacts.setResources(resources);

            this.sentInvites = new MutableSet<Invite>();
            this.sentInvites.setAuthor(this.ownAccountDevices.owner);
            this.namespace.define('sentInvites', this.sentInvites);
            this.sentInvites.setResources(resources);

            this.receivedInviteTokens = new MutableSet<InviteToken>();
            this.receivedInviteTokens.setAuthor(this.ownAccountDevices.owner);
            this.namespace.define('receivedInviteTokens', this.receivedInviteTokens);
            this.receivedInviteTokens.setResources(resources);



            this.ownAccountDevices.addSyncTarget(this);
        }
    }

    getRootObjects(): IterableIterator<MutableObject> {
        return this.namespace.getAll();
    }

    getContacts(sortFn? : (a: Identity, b: Identity) => number) : Identity[] {
        let contacts = Array.from(this.getContacts().values());

        if (sortFn === undefined) {
            sortFn = (a: Identity, b: Identity) => {
                
                const aHasName = typeof(a.info?.name) === 'string';
                const bHasName = typeof(b.info?.name) === 'string';

                if ( !aHasName && !bHasName) {
                    return 0;
                } else if (!aHasName) {
                    return -1;
                } else if (!bHasName) {
                    return 1;
                } else {

                    const aName = a.info?.name as string;
                    const bName = b.info?.name as string;

                    return aName.localeCompare(bName);
                }
            }
        }

        contacts.sort(sortFn)

        return contacts;
    }

    async localSync() {
        await this.contacts.loadAndWatchForChanges();
        await this.sentInvites.loadAndWatchForChanges();
        await this.receivedInviteTokens.loadAndWatchForChanges();
        await this.acceptedInviteTokens.loadAndWatchForChanges();
    }

    async remoteSync() {

        // Sync info shared with contacts:
        await this.remoteSyncWithAllContacts();

        // Sync new contact negotiation info:
        await this.remoteSyncInvitesWithAllRecipients();      // <-- sent invites
        await this.remoteSyncAcceptedInvitesWithAllSenders(); // <-- received invites
                                                              //     (if accepted)

        // Sync own contacts info with all of this account devices:
        this.ownAccountDevices.addSyncTarget(this);
    }

    private async remoteSyncWithAllContacts() {

        this.contacts.watchForChanges(false);

        await this.contacts.loadAllChanges();

        this.contacts.onAddition((id: Identity) => {
            this.remoteSyncWithContact(id);
        });

        this.contacts.onDeletion((id: Identity) => {
            // TODO !
        });

        for (const id of this.contacts.values()) {
            this.remoteSyncWithContact(id);
        }

        this.contacts.watchForChanges(true);
    } 

    private remoteSyncWithContact(id: Identity) {

        if (!this.allContactPairDevices.has(id.hash())) {
            let contactPairDevices = new ContactPairDevices(this.ownAccountDevices, id.hash());
            contactPairDevices.init(this.resources);
            this.allContactPairDevices.set(id.hash(), contactPairDevices);
            contactPairDevices.remoteSync();
        }
    }

    private async remoteSyncInvitesWithAllRecipients() {

        this.sentInvites.watchForChanges(false);

        await this.sentInvites.loadAllChanges();

        this.sentInvites.onAddition((invite: Invite) => {
            this.remoteSyncInviteWithRecipient(invite);
        });

        this.sentInvites.onDeletion((invite: Invite) => {
            // TODO !
        });

        for (const invite of this.sentInvites.values()) {
            this.remoteSyncInviteWithRecipient(invite);
        }

        this.sentInvites.watchForChanges(true);
    }

    private remoteSyncInviteWithRecipient(invite: Invite) {
        let inviteHash = invite.hash();

        if (!this.pendingSentInviteDevices.has(inviteHash)) {
            let pending = new PendingInviteDevices(invite.token);

            pending.init(this.resources);
            this.pendingSentInviteDevices.set(inviteHash, pending);
            pending.waitForReply();
        }
        
    }

    private async remoteSyncAcceptedInvitesWithAllSenders() {
        await this.receivedInviteTokens.loadAllChanges();
        
        this.receivedInviteTokens.onAddition((token: InviteToken) => {
            // TODO: send and event notifying we've received a contact request.
        });

        this.receivedInviteTokens.onDeletion((token: InviteToken) => {
            // TODO: send an event notifying a contact request has been resolved.
        });

        this.sentInvites.onAddition((invite: Invite) => {
            this.remoteSyncInviteWithRecipient(invite);
        });

        this.sentInvites.onDeletion((invite: Invite) => {
            // TODO !
        });

        for (const invite of this.sentInvites.values()) {
            this.remoteSyncInviteWithRecipient(invite);
        }
    }

    private waitToSendInviteReply(inviteToken: InviteToken) {

    }

    getContactPairDevices(identityHash: Hash) : ContactPairDevices | undefined {
        return this.allContactPairDevices.get(identityHash);
    }

}