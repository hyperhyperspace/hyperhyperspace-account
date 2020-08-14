
import { Hashing, Identity} from 'hyper-hyper-space';
import { PeerSource, PeerInfo } from 'hyper-hyper-space';
import { Resources } from 'hyper-hyper-space';

import { PeerGroup } from '../../sync/PeerGroup';
import { InviteToken } from '../data/InviteToken';
import { AccountDevices } from '../../account/peers/AccountDevices';


class PendingInviteDevices extends PeerGroup {

    inviteToken: InviteToken;

    private sender?: boolean;

    // only present if we are the sender of the invite:
    senderAccountDevices?: AccountDevices;

    // only present if we are the receiver:
    receiverIdentity?: Identity;

    resources?: Resources;

    constructor(inviteToken: InviteToken) {
        super();

        this.inviteToken = inviteToken;

    }

    forInviteSender(senderAccountDevices: AccountDevices) {
        
        this.sender = true;
        this.senderAccountDevices = senderAccountDevices;
        this.receiverIdentity     = undefined;
    }

    forInviteReceiver(receiverIdentity: Identity) {

        this.sender = false;
        this.senderAccountDevices = undefined;
        this.receiverIdentity     = receiverIdentity;
    }

    init(resources: Resources) {
        this.resources = resources;
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
            return this.senderAccountDevices?.getLocalPeer() as Promise<PeerInfo>;
        } else {
            return this.inviteToken.getReceiverPeer(this.receiverIdentity as Identity) as PeerInfo;
        }
    }

    async getPeerSource(): Promise<PeerSource> {
        return new PendingInvitePeers(this);
    }
    
}

class PendingInvitePeers implements PeerSource {

    pendingInviteDevices: PendingInviteDevices;

    constructor(pendingInviteDevices: PendingInviteDevices) {
        this.pendingInviteDevices = pendingInviteDevices;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        if (this.pendingInviteDevices.isSender()) {
            const senderPeerSource = await (this.pendingInviteDevices.senderAccountDevices as AccountDevices).getPeerSource();
            return senderPeerSource.getPeers(count);
        } else {
            return this.pendingInviteDevices.inviteToken.getSenderPeers();
        }
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {

        if (this.pendingInviteDevices.isSender()) {
            const senderPeerSource = await (this.pendingInviteDevices.senderAccountDevices as AccountDevices).getPeerSource();
            let pi: PeerInfo | undefined = await senderPeerSource.getPeerForEndpoint(endpoint);

            if (pi === undefined) {
                const token = this.pendingInviteDevices.inviteToken;
                pi = token.parseReceiverEndpoint(endpoint);
            }

            return pi;
        } else {
            const token = this.pendingInviteDevices.inviteToken;
            return token.parseSenderEndpoint(endpoint);
        }
    }



}

export { PendingInviteDevices };