import { Hash, Resources, Identity, HashedObject, SyncMode, PeerGroupSync} from 'hhs';

import { DeviceCloud } from 'modules/device-cloud/DeviceCloud';
import { DeviceCloudPeerGroup } from 'modules/device-cloud/peers/DeviceCloudPeerGroup';


import { Invite } from './model/Invite';
import { InviteToken } from './model/InviteToken';
import { OwnContacts } from './model/OwnContacts';

import { ContactPairDevicesPeerGroup } from './peers/ContactPairDevicesPeerGroup';
import { PendingInviteDevicesPeerGroup } from './peers/PendingInviteDevicesPeerGroup';

import { Module } from 'util/Module';

class Contacts extends Module {

    ownDeviceCloud: DeviceCloud;

    ownContacts?: OwnContacts;

    allContactPairPeerGroups: Map<Hash, ContactPairDevicesPeerGroup>;
    allContactPairPeerGroupSyncs: Map<Hash, PeerGroupSync>;

    allPendingInvitePeerGroups: Map<Hash, PendingInviteDevicesPeerGroup>;
    allPendingInvitePeerGroupSyncs: Map<Hash, PeerGroupSync>;

    resources?: Resources;

    onNewContact: (contactIdentity: Identity) => void;
    onRemovedContact: (contactIdentity: Identity) => void;

    onNewSentInvite: (invite: Invite) => void;
    onRemovedSentInvite: (invite: Invite) => void;

    onNewAcceptedInvite: (token: InviteToken) => void;
    onRemovedAcceptedInvite: (token: InviteToken) => void;

    constructor(ownDeviceCloud: DeviceCloud) {
        super();
        
        this.ownDeviceCloud = ownDeviceCloud;

        this.allContactPairPeerGroups = new Map();
        this.allContactPairPeerGroupSyncs = new Map();
        this.allPendingInvitePeerGroups = new Map();
        this.allPendingInvitePeerGroupSyncs = new Map();

        this.onNewContact = (contactIdentity: Identity) => {
            this.setUpContactPair(contactIdentity.hash());
        };

        this.onRemovedContact = (contactIdentity: Identity) => {
            const hash = contactIdentity.hash();
            this.tearDownContactPair(hash);
        };

        this.onNewSentInvite = (invite: Invite) => {
            const token = invite.token as InviteToken;
            this.setUpPendingInvite(token, 'sender');
        };

        this.onRemovedSentInvite = (invite: Invite) => {
            const token = invite.token as InviteToken;
            this.tearDownPendingInvite(token, 'sender');
        };

        this.onNewAcceptedInvite = (token: InviteToken) => {
            this.setUpPendingInvite(token, 'receiver');
        };

        this.onRemovedAcceptedInvite = (token: InviteToken) => {
            this.tearDownPendingInvite(token, 'receiver');
        };
    }

    async init(resources: Resources) {
        
        if (resources === undefined) {
            this.resources = resources;

            const owner = this.ownDeviceCloud.peerGroup?.ownDevices?.owner as Identity;

            this.ownContacts = new OwnContacts(owner);
            this.ownContacts.setResources(resources);

            this.ownContacts?.contacts?.onAddition(this.onNewContact);
            this.ownContacts?.contacts?.onDeletion(this.onRemovedContact);
            this.ownContacts?.contacts?.loadAndWatchForChanges();

            this.ownContacts?.sentInvites?.onAddition(this.onNewSentInvite);
            this.ownContacts?.sentInvites?.onDeletion(this.onRemovedSentInvite);
            this.ownContacts?.sentInvites?.loadAndWatchForChanges();

            this.ownContacts?.acceptedInviteTokens?.onAddition(this.onNewAcceptedInvite);
            this.ownContacts?.acceptedInviteTokens?.onDeletion(this.onRemovedAcceptedInvite);
            this.ownContacts?.acceptedInviteTokens?.loadAndWatchForChanges();

        }
        
    }
    
    private async setUpContactPair(contactIdentityHash: Hash) {

        let contactPairPeerGroup = 
                this.allContactPairPeerGroups.get(contactIdentityHash);

        if (contactPairPeerGroup === undefined) {
            const ownPeerGroup = this.ownDeviceCloud.peerGroup;        
            
            contactPairPeerGroup = new ContactPairDevicesPeerGroup(ownPeerGroup, contactIdentityHash);
            this.allContactPairPeerGroups.set(contactIdentityHash, contactPairPeerGroup);
            
            await contactPairPeerGroup.init(this.getResources());
            
            let contactPairPeerGroupSync = new PeerGroupSync(contactPairPeerGroup);

            this.allContactPairPeerGroupSyncs.set(contactIdentityHash, contactPairPeerGroupSync);
            
            contactPairPeerGroupSync.addSyncTarget(
                this.ownDeviceCloud.peerGroup.ownDevices as HashedObject, SyncMode.recursive);
            contactPairPeerGroupSync.addSyncTarget(
                contactPairPeerGroup.contactPeerGroup?.ownDevices as HashedObject, SyncMode.recursive);

            this.addModuleSync(contactPairPeerGroupSync);
        }
    }

    private async tearDownContactPair(contactIdentityHash: Hash) {

        let contactPairPeerGroup = 
                this.allContactPairPeerGroups.get(contactIdentityHash);
        let contactPairPeerGroupSync =
                this.allContactPairPeerGroupSyncs.get(contactIdentityHash);

        if (contactPairPeerGroup !== undefined) {

            if (contactPairPeerGroupSync !== undefined) {
                this.removeModuleSync(contactPairPeerGroupSync)
                this.allContactPairPeerGroupSyncs.delete(contactIdentityHash);
            }

            this.allContactPairPeerGroups.delete(contactIdentityHash);
            contactPairPeerGroup.deinit();
        }
    }

    private async setUpPendingInvite(token: InviteToken, role:'sender'|'receiver') {

        const hash = token.hash();

        if (!this.allPendingInvitePeerGroups.has(hash)) {
            const pendingInvitePeerGroup = new PendingInviteDevicesPeerGroup(token);
            this.allPendingInvitePeerGroups.set(hash, pendingInvitePeerGroup);

            if (role === 'sender') {
                const ownPeerGroup = this.ownDeviceCloud.peerGroup as DeviceCloudPeerGroup;
                pendingInvitePeerGroup.forInviteSender(ownPeerGroup);
            } else if (role === 'receiver') {
                let receiverIdentity = await this.resources?.store.load(this.ownDeviceCloud.ownerIdentityHash) as Identity;
                pendingInvitePeerGroup.forInviteReceiver(receiverIdentity);
            }

            await pendingInvitePeerGroup.init(this.getResources());
            
            let pendingInvitePeerGroupSync = new PeerGroupSync(pendingInvitePeerGroup);

            this.allPendingInvitePeerGroupSyncs.set(hash, pendingInvitePeerGroupSync);
            
            pendingInvitePeerGroupSync.addSyncTarget(
                token.sender as HashedObject, SyncMode.recursive);
            pendingInvitePeerGroupSync.addSyncTarget(
                token.reply as HashedObject, SyncMode.recursive);

            this.addModuleSync(pendingInvitePeerGroupSync);
        }
    }

    private async tearDownPendingInvite(token: InviteToken, role: 'sender'|'receiver') {
        
        role;
        const hash = token.hash();
        const pendingInvitePeerGroup = this.allPendingInvitePeerGroups.get(hash);
        const pendingInvitePeerGroupSync = this.allPendingInvitePeerGroupSyncs.get(hash);

        if (pendingInvitePeerGroup !== undefined) {

            if (pendingInvitePeerGroupSync !== undefined) {
                this.removeModuleSync(pendingInvitePeerGroupSync);
                this.allPendingInvitePeerGroupSyncs.delete(hash);
            }
            
            this.allPendingInvitePeerGroups.delete(hash);
            await pendingInvitePeerGroup.deinit();
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

export { Contacts as ContactsSync };