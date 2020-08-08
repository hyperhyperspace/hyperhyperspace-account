import { MutableSet, Hash, Identity, Namespace, Resources, MutableObject } from 'hyper-hyper-space';

import { AccountDevices } from '../account/AccountDevices';

import { ContactPairDevices } from './ContactPairDevices';
import { SyncTarget } from '../sync/SyncTarget';
import { Invite } from './Invite';
import { InviteToken } from './InviteToken';
import { PendingInviteDevices } from './PendingInviteDevices';


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

    async localSync() {
        await this.contacts.loadAndWatchForChanges();
        await this.sentInvites.loadAndWatchForChanges();
        await this.receivedInviteTokens.loadAndWatchForChanges();
        await this.acceptedInviteTokens.loadAndWatchForChanges();
    }

    async remoteSync() {

        this.ownAccountDevices.addSyncTarget(this);

        await this.remoteSyncWithContacts();

        await this.remoteSyncInvitesWithRecipients();
        await this.remoteSyncAcceptedInvitesWithSenders();
    }

    private async remoteSyncWithContacts() {

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

    private async remoteSyncInvitesWithRecipients() {

        this.sentInvites.watchForChanges(false);

        await this.sentInvites.loadAllChanges();

        this.sentInvites.onAddition((invite: Invite) => {
            this.waitForInviteReply(invite);
        });

        this.sentInvites.onDeletion((invite: Invite) => {
            // TODO !
        });

        for (const invite of this.sentInvites.values()) {
            this.waitForInviteReply(invite);
        }

        this.sentInvites.watchForChanges(true);
    }

    private waitForInviteReply(invite: Invite) {
        let inviteHash = invite.hash();

        if (!this.pendingSentInviteDevices.has(inviteHash)) {
            let pending = new PendingInviteDevices(invite.token);

            pending.init(this.resources);
            this.pendingSentInviteDevices.set(inviteHash, pending);
            pending.waitForReply();
        }
        
    }

    private async remoteSyncAcceptedInvitesWithSenders() {
        await this.receivedInviteTokens.loadAllChanges();
        
        this.receivedInviteTokens.onAddition((token: InviteToken) => {
            // TODO: send and event notifying we've received a contact request.
        });

        this.receivedInviteTokens.onDeletion((token: InviteToken) => {
            // TODO: send an event notifying a contact request has been resolved.
        });

        this.sentInvites.onAddition((invite: Invite) => {
            this.waitForInviteReply(invite);
        });

        this.sentInvites.onDeletion((invite: Invite) => {
            // TODO !
        });

        for (const invite of this.sentInvites.values()) {
            this.waitForInviteReply(invite);
        }
    }

    private waitToSendInviteReply(inviteToken: InviteToken) {

    }

    getContactPairDevices(identityHash: Hash) : ContactPairDevices | undefined {
        return this.allContactPairDevices.get(identityHash);
    }

}