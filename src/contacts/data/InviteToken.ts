import { Hash, HashedObject, HashedSet, HashReference, Identity, RNGImpl, PeerInfo, HMACImpl, Endpoint } from 'hyper-hyper-space';
import { Device } from '../../account/data/Device';

const BITS_FOR_SECRET = 32;

class InviteToken extends HashedObject {

    static className = 'hhs-home/v0/InviteToken';

    secret?             : string; 
 
    senderIdentityHash? : Hash;
    senderInfo?         : any; 
    senderDevices?      : HashedSet<HashReference<Device>>;
    senderLinkup?       : string;

    constructor(sender?: Identity, devices?: IterableIterator<Device>, linkup?: string) {
        super();

        if (sender !== undefined) {
            this.secret = new RNGImpl().randomHexString(BITS_FOR_SECRET);

            const deviceReferences = Array.from(devices as IterableIterator<Device>).map((d: Device) => d.createReference()).values();
            
            this.senderIdentityHash = sender.hash();
            this.senderInfo         = sender.info;
            this.senderDevices      = new HashedSet(deviceReferences);
            this.senderLinkup             = linkup;
        }
    }

    init(): void {
        
    }

    toToken() {
        const devices = this.senderDevices as HashedSet<HashReference<Device>>;
        let deviceHashes = Array.from(devices.values()).map((d: HashReference<Device>) => d.hash);
        return JSON.stringify({ s: this.senderIdentityHash, sec: this.secret, i: this.senderInfo, d: deviceHashes, l: this.senderLinkup });
    }

    fromToken(token: string) {
        let tokenValues = JSON.parse(token);

        this.secret = tokenValues.sec;
        this.senderIdentityHash = tokenValues.s;
        this.senderInfo = tokenValues.i;
        let deviceRefs = tokenValues.d.map((h: Hash) => new HashReference(h, Device.className));
        this.senderDevices = new HashedSet(deviceRefs); 
        this.senderLinkup = tokenValues.l;
    }
    
    validate(references: Map<string, HashedObject>): boolean {
        references;
        return this.senderIdentityHash !== undefined && typeof(this.senderIdentityHash) === 'string' &&
               this.secret !== undefined && typeof(this.secret) === 'string' &&
               this.senderDevices !== undefined && this.senderDevices instanceof HashedSet &&
               this.senderLinkup !== undefined && typeof(this.senderLinkup) === 'string';
    }

    getClassName(): string {
        return InviteToken.className;
    }

    getSenderPeers() : PeerInfo[] {
        let peers: PeerInfo[] = [];

        const devices = this.senderDevices as HashedSet<HashReference<Device>>;

        for (const deviceRef of devices.values()) {
            let ep = Device.endpointForDeviceHash(deviceRef.hash, this.senderLinkup as string);
            peers.push({endpoint: ep, identityHash: this.senderIdentityHash});
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
            const devices = this.senderDevices as HashedSet<HashReference<Device>>;
            if (devices.has(deviceRef)) {
                pi = { endpoint: Device.endpointForDeviceHash(deviceHash, this.senderLinkup as string), identityHash: this.senderIdentityHash }
            }
        }

        return pi;
        
    }

    getReceiverPeer(receiverIdentity: Identity) : PeerInfo {
        let ep = this.senderLinkup as string;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }

        const receiverIdentityHash = receiverIdentity.hash();
        ep = ep + 'invite-reply/' + receiverIdentityHash + '/' + new HMACImpl().hmacSHA256hex(receiverIdentityHash, this.secret as string);

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

        if (parts[1] === new HMACImpl().hmacSHA256hex(parts[0], this.secret as string)) {
            return { endpoint: ep, identityHash: parts[0] }
        } else {
            return undefined;
        }
    }
    
}

HashedObject.registerClass(InviteToken.className, InviteToken);

export { InviteToken };