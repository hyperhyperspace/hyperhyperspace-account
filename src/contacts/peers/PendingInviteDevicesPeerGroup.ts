
import { Hashing, Identity} from 'hhs';
import { PeerGroup, PeerSource, PeerInfo, Endpoint } from 'hhs';
import { Hash, HashReference, HashedSet } from 'hhs';
import { HMACImpl } from 'hhs';
import { Resources } from 'hhs';

import { InviteToken } from '../model/InviteToken';
import { AccountDevicesPeerGroup } from '../../account/peers/AccountDevicesPeerGroup';
import { Device } from '../../account/model/Device';


class PendingInviteDevicesPeerGroup extends PeerGroup {

    inviteToken: InviteToken;

    private sender?: boolean;

    // only present if we are the sender of the invite:
    senderPeerGroup?: AccountDevicesPeerGroup;

    // only present if we are the receiver:
    receiverIdentity?: Identity;

    resources?: Resources;

    constructor(inviteToken: InviteToken) {
        super();

        this.inviteToken = inviteToken;

    }

    forInviteSender(senderPeerGroup: AccountDevicesPeerGroup) {
        
        this.sender = true;
        this.senderPeerGroup  = senderPeerGroup;
        this.receiverIdentity = undefined;
    }

    forInviteReceiver(receiverIdentity: Identity) {

        this.sender = false;
        this.senderPeerGroup  = undefined;
        this.receiverIdentity = receiverIdentity;
    }

    async init(resources: Resources) {
        this.resources = resources;
    }

    async deinit() {

    }

    isSender() {

        if (this.sender === undefined) {
            throw new Error('PendingInviteDevices needs to know if it is the sender of the invite, but neither forInviteSender or forInviteReceiver have been called.');
        }

        return this.sender;
    }

    getResources(): Resources {
        if (this.resources === undefined) {
            throw new Error('PendingInviteDevices is not initialized, resources is undefined.');
        } else {
            return this.resources;
        }
    }

    getPeerGroupId(): string {
        return 'hhs-home-pending-invite-' + Hashing.forString(this.inviteToken.hash());
    }

    async getLocalPeer(): Promise<PeerInfo> {

        if (this.isSender()) {
            return this.senderPeerGroup?.getLocalPeer() as Promise<PeerInfo>;
        } else {
            return this.getReceiverPeer(this.receiverIdentity as Identity) as PeerInfo;
        }
    }

    async getPeerSource(): Promise<PeerSource> {
        return new PendingInvitePeers(this);
    }
    

    getSenderPeers() : PeerInfo[] {
        let peers: PeerInfo[] = [];

        const token = this.inviteToken;

        const devices = token.senderDevices as HashedSet<HashReference<Device>>;
        const linkup  = token.senderLinkup as string;
        const identityHash = token.senderIdentityHash as Hash;

        for (const deviceRef of devices.values()) {
            let ep = Device.endpointForDeviceHash(deviceRef.hash, linkup as string);
            peers.push({endpoint: ep, identityHash: identityHash});
        }

        return peers;
    }

    parseSenderEndpoint(ep: Endpoint) : PeerInfo | undefined {

        let deviceHash: Hash | undefined = undefined;
        let pi: PeerInfo | undefined = undefined;

        try {
            deviceHash = Device.deviceHashFromEndpoint(ep);
        } catch(e) {
            // no luck.
        }

        if (deviceHash !== undefined) {
            let deviceRef = new HashReference(deviceHash, Device.className);

            const token = this.inviteToken;
            const devices = token.senderDevices as HashedSet<HashReference<Device>>;
            const linkup  = token.senderLinkup as string;
            const identityHash = token.senderIdentityHash;
            if (devices.has(deviceRef)) {
                pi = { endpoint: Device.endpointForDeviceHash(deviceHash, linkup as string), identityHash: identityHash }
            }
        }

        return pi;
        
    }

    getReceiverPeer(receiverIdentity: Identity) : PeerInfo {

        const token = this.inviteToken;
        const linkup  = token.senderLinkup as string;
        const secret = token.secret as string;

        let ep = linkup;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }

        const receiverIdentityHash = receiverIdentity.hash();
        ep = ep + 'invite-reply/' + receiverIdentityHash + '/' + new HMACImpl().hmacSHA256hex(receiverIdentityHash, secret);

        return { endpoint: ep, identityHash: receiverIdentityHash};
    }

    parseReceiverEndpoint(ep: Endpoint) : PeerInfo | undefined {
        let parts = ep.split('/invite-reply/');
        if (parts.length !== 2) {
            return undefined;
        }

        parts = parts[1].split('/');

        if (parts.length !== 2) {
            return undefined;
        }

        const token = this.inviteToken;
        const secret = token.secret as string;

        if (parts[1] === new HMACImpl().hmacSHA256hex(parts[0], secret)) {
            return { endpoint: ep, identityHash: parts[0] }
        } else {
            return undefined;
        }
    }
}

class PendingInvitePeers implements PeerSource {

    pendingInviteDevices: PendingInviteDevicesPeerGroup;

    constructor(pendingInviteDevices: PendingInviteDevicesPeerGroup) {
        this.pendingInviteDevices = pendingInviteDevices;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        if (this.pendingInviteDevices.isSender()) {
            const senderPeerSource = await (this.pendingInviteDevices.senderPeerGroup as PeerGroup).getPeerSource();
            return senderPeerSource.getPeers(count);
        } else {
            return this.pendingInviteDevices.getSenderPeers();
        }
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {

        if (this.pendingInviteDevices.isSender()) {
            const senderPeerSource = await (this.pendingInviteDevices.senderPeerGroup as PeerGroup).getPeerSource();
            let pi: PeerInfo | undefined = await senderPeerSource.getPeerForEndpoint(endpoint);

            if (pi === undefined) {
                pi = this.pendingInviteDevices.parseReceiverEndpoint(endpoint);
            }

            return pi;
        } else {
            return this.pendingInviteDevices.parseSenderEndpoint(endpoint);
        }
    }

}

export { PendingInviteDevicesPeerGroup };