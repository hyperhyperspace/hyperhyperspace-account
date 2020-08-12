import { Hash, HashedObject, HashedSet, HashReference, Identity, RNGImpl, PeerInfo, Endpoint } from 'hyper-hyper-space';
import { Device } from '../account/data/Device';

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

            const deviceReferences = Array.from(devices).map((d: Device) => d.createReference()).values();
            
            this.senderIdentityHash = sender.hash();
            this.senderInfo         = sender.info;
            this.senderDevices      = new HashedSet(deviceReferences);
            this.senderLinkup             = linkup;
        }
    }

    init(): void {
        
    }

    toToken() {
        let deviceHashes = Array.from(this.senderDevices.values()).map((d: HashReference<Device>) => d.hash);
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
}

HashedObject.registerClass(InviteToken.className, InviteToken);

export { InviteToken };