import { Hash, Resources, Identity, MutableSet, HashedObject, SyncMode} from 'hyper-hyper-space';

import { AccountDevicesSync } from '../../account/sync/AccountDevicesSync';
import { AccountDevicesPeerGroup } from '../../account/peers/AccountDevicesPeerGroup';

import { Contacts } from '../model/Contacts';
import { ContactPairDevicesPeerGroup } from '../peers/ContactPairDevicesPeerGroup';

import { AccountDevices } from '../../account/model/AccountDevices';
import { Invite } from '../model/Invite';
import { InviteToken } from '../model/InviteToken';
import { PendingInviteDevicesPeerGroup } from '../peers/PendingInviteDevicesPeerGroup';

class ContactsSync {

    ownAccountDevicesSync: AccountDevicesSync;

    contacts?: Contacts;

    allContactPairPeerGroups: Map<Hash, ContactPairDevicesPeerGroup>;
    allPendingInvitePeerGroups: Map<Hash, PendingInviteDevicesPeerGroup>;

    resources?: Resources;

    syncTargetsPerContact: Map<Hash, Map<Hash, HashedObject>>;
    syncModesPerContact  : Map<Hash, Map<Hash, SyncMode>>;
    started: boolean;

    onNewContact: (contactIdentity: Identity) => void;
    onRemovedContact: (contactIdentity: Identity) => void;

    onNewSentInvite: (invite: Invite) => void;
    onRemovedSentInvite: (invite: Invite) => void;

    onNewAcceptedInvite: (token: InviteToken) => void;
    onRemovedAcceptedInvite: (token: InviteToken) => void;

    constructor(ownAccountDevicesSync: AccountDevicesSync) {
        this.ownAccountDevicesSync = ownAccountDevicesSync;

        this.allContactPairPeerGroups = new Map();
        this.allPendingInvitePeerGroups = new Map();

        this.syncTargetsPerContact = new Map();
        this.syncModesPerContact   = new Map();
        this.started = false;

        this.onNewContact = (contactIdentity: Identity) => {
            this.addContactPairPeerGroup(contactIdentity.hash());
            if (this.started) { 
                this.joinContactPairPeerGroupOnMesh(contactIdentity.hash());
            }
        };

        this.onRemovedContact = (contactIdentity: Identity) => {
            const hash = contactIdentity.hash();
            if (this.started) {
                this.leaveContactPairPeerGroupOnMesh(hash);
            }
            this.removeContactPeerGroup(hash);
        };

        this.onNewSentInvite = (invite: Invite) => {
            const token = invite.token as InviteToken;
            this.addPendingInvitePeerGroup(token, 'sender');
            if (this.started) {
                this.joinPendingInvitePeerGroupOnMesh(token);
            }
        };

        this.onRemovedSentInvite = (invite: Invite) => {
            const token = invite.token as InviteToken;
            this.removePendingInvitePeerGroup(token, 'sender');
            if (this.started) {
                this.leavePendingInvitePeerGroupOnMesh(token);
            }
        };

        this.onNewAcceptedInvite = (token: InviteToken) => {
            this.addPendingInvitePeerGroup(token, 'receiver');
            if (this.started) {
                this.joinPendingInvitePeerGroupOnMesh(token);
            }
        };

        this.onRemovedAcceptedInvite = (token: InviteToken) => {
            this.removePendingInvitePeerGroup(token, 'receiver');
            if (this.started) {
                this.leavePendingInvitePeerGroupOnMesh(token);
            }
        };
    }

    async init(resources: Resources) {


        if (resources === undefined) {
            this.resources = resources;

            const owner = this.ownAccountDevicesSync.peerGroup?.accountDevices?.owner as Identity;

            this.contacts = new Contacts(owner);
            this.contacts.setResources(resources);

            this.contacts?.contacts?.onAddition(this.onNewContact);
            this.contacts?.contacts?.onDeletion(this.onRemovedContact);
            this.contacts?.contacts?.loadAndWatchForChanges();

            this.contacts?.sentInvites?.onAddition(this.onNewSentInvite);
            this.contacts?.sentInvites?.onDeletion(this.onRemovedSentInvite);
            this.contacts?.sentInvites?.loadAndWatchForChanges();

            this.contacts?.acceptedInviteTokens?.onAddition(this.onNewAcceptedInvite);
            this.contacts?.acceptedInviteTokens?.onDeletion(this.onRemovedAcceptedInvite);
            this.contacts?.acceptedInviteTokens?.loadAndWatchForChanges();

        }
        
    }

    async start() {

        if (!this.started) {


            for (const contact of (this.contacts?.contacts as MutableSet<Identity>).values()) {
                const hash = contact.hash();

                if (this.allContactPairPeerGroups.has(hash)) {
                    this.joinContactPairPeerGroupOnMesh(hash);
                }
            }

            for (const invite of (this.contacts?.sentInvites as MutableSet<Invite>).values()) {
                const token = invite.token as InviteToken;
                const hash  = token.hash();

                if (this.allPendingInvitePeerGroups.has(hash)) {
                    this.joinPendingInvitePeerGroupOnMesh(token);
                }
            }

            for (const token of (this.contacts?.acceptedInviteTokens as MutableSet<InviteToken>).values()) {
                const hash = token.hash();

                if (this.allPendingInvitePeerGroups.has(hash)) {
                    this.joinPendingInvitePeerGroupOnMesh(token);
                }
            }

            this.started = true;
        }
    }

    syncWithContact(contactIdentityHash: Hash, obj: HashedObject, mode: SyncMode) {

        const syncTarget = this.syncTargetsPerContact.get(contactIdentityHash);
        const syncModes  = this.syncModesPerContact.get(contactIdentityHash);

        if (syncTarget === undefined || syncModes === undefined) {
            throw new Error('Cannot sync object with contact ' + contactIdentityHash + ' because its peer group has not been initialized.');
        }

        const hash = obj.hash();
        syncTarget.set(hash, obj);
        syncModes.set(hash, mode);

        if (this.started) {
            this.syncObjectWithContactOnMesh(contactIdentityHash, obj, mode);
        }
    }
    
    private async addContactPairPeerGroup(contactIdentityHash: Hash) {

        let contactPairPeerGroup = 
                this.allContactPairPeerGroups.get(contactIdentityHash);

        if (contactPairPeerGroup === undefined) {
            const ownPeerGroup = this.ownAccountDevicesSync.peerGroup as AccountDevicesPeerGroup;        
            
            contactPairPeerGroup = new ContactPairDevicesPeerGroup(ownPeerGroup, contactIdentityHash);
            await contactPairPeerGroup.init(this.getResources());

            this.allContactPairPeerGroups.set(contactIdentityHash, contactPairPeerGroup);
            
            this.syncTargetsPerContact.set(contactIdentityHash, new Map());
            this.syncModesPerContact.set(contactIdentityHash, new Map());

            let ownAccountDevices = ownPeerGroup.accountDevices as AccountDevices;
            let contactAccountDevices = contactPairPeerGroup.contactPeerGroup?.accountDevices as AccountDevices;

            this.syncWithContact(contactIdentityHash, ownAccountDevices, SyncMode.recursive);
            this.syncWithContact(contactIdentityHash, contactAccountDevices, SyncMode.recursive);
        }
    }

    private async removeContactPeerGroup(contactIdentityHash: Hash) {
        let contactPairPeerGroup = 
                this.allContactPairPeerGroups.get(contactIdentityHash);

        if (contactPairPeerGroup !== undefined) {

            contactPairPeerGroup.deinit();

            this.syncTargetsPerContact.delete(contactIdentityHash);
            this.syncModesPerContact.delete(contactIdentityHash);

            this.allContactPairPeerGroups.delete(contactIdentityHash);
        }
    }

    private joinContactPairPeerGroupOnMesh(contactIdentityHash: Hash) {
        let contactPairPeerGroup = 
                this.allContactPairPeerGroups.get(contactIdentityHash);

        this.resources?.mesh.joinPeerGroup(contactPairPeerGroup?.getPeerGroupInfo());
    }

    private leaveContactPairPeerGroupOnMesh(contactIdentityHash: Hash) {
        let contactPairPeerGroup = 
            this.allContactPairPeerGroups.get(contactIdentityHash);

        if (contactPairPeerGroup !== undefined) {
            this.resources?.mesh.leavePeerGroup(contactPairPeerGroup.getPeerGroupId());
        }
    }

    private syncObjectWithContactOnMesh(contactIdentityHash: Hash, obj: HashedObject, mode: SyncMode) {
        const contactPairPeerGroup = 
        this.allContactPairPeerGroups.get(contactIdentityHash);

        if (contactPairPeerGroup === undefined) {
            throw new Error('Cannot sync object with contact ' + contactIdentityHash + ' because its peer group has not been initialized.');
        }

        this.resources?.mesh.syncObjectWithPeerGroup(contactPairPeerGroup.getPeerGroupInfo(), obj, mode);
    }

    private async addPendingInvitePeerGroup(token: InviteToken, role:'sender'|'receiver') {

        const hash = token.hash();

        if (!this.allPendingInvitePeerGroups.has(hash)) {
            const pendingInvitePeerGroup = new PendingInviteDevicesPeerGroup(token);

            if (role === 'sender') {
                const ownPeerGroup = this.ownAccountDevicesSync.peerGroup as AccountDevicesPeerGroup;
                pendingInvitePeerGroup.forInviteSender(ownPeerGroup);
            } else if (role === 'receiver') {
                let receiverIdentity = await this.resources?.store.load(this.ownAccountDevicesSync.ownerIdentityHash) as Identity;
                pendingInvitePeerGroup.forInviteReceiver(receiverIdentity);
            }

            
            await pendingInvitePeerGroup.init(this.getResources());
            this.allPendingInvitePeerGroups.set(hash, pendingInvitePeerGroup);
        }
    }

    private async removePendingInvitePeerGroup(token: InviteToken, role: 'sender'|'receiver') {
        
        role;
        const hash = token.hash();
        const pendingInvitePeerGroup = this.allPendingInvitePeerGroups.get(hash);

        if (pendingInvitePeerGroup !== undefined) {
            await pendingInvitePeerGroup.deinit();
            this.allPendingInvitePeerGroups.delete(hash);
        }

    }

    private joinPendingInvitePeerGroupOnMesh(token: InviteToken) {

        const hash = token.hash();

        const pendingInvitePeerGroup = this.allPendingInvitePeerGroups.get(hash) as PendingInviteDevicesPeerGroup;

        this.resources?.mesh.joinPeerGroup(pendingInvitePeerGroup.getPeerGroupInfo());

        this.resources?.mesh.syncObjectWithPeerGroup(pendingInvitePeerGroup.getPeerGroupId(), token.sender, SyncMode.recursive);
        this.resources?.mesh.syncObjectWithPeerGroup(pendingInvitePeerGroup.getPeerGroupId(), token.reply, SyncMode.recursive);
    }

    private leavePendingInvitePeerGroupOnMesh(token: InviteToken) {

        const hash = token.hash();

        const pendingInvitePeerGroup = this.allPendingInvitePeerGroups.get(hash);

        if (pendingInvitePeerGroup !== undefined) {
            this.resources?.mesh.leavePeerGroup(pendingInvitePeerGroup.getPeerGroupId());
        }
    }

    getResources() : Resources {
        if (this.resources === undefined) {
            throw new Error('ContactsService has not been initialized: resources is undefined.');
        } else {
            return this.resources;
        }
    }


}

export { ContactsSync };