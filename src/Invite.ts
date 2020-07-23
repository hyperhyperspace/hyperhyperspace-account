import { Hash, HashedObject, HashedLiteral, MutableReference, RNGImpl, ChaCha20Impl, HMACImpl } from 'hyper-hyper-space';
import { Peer, Endpoint } from 'hyper-hyper-space';
import { InviteReply } from './InviteReply';
import { Device } from './Device';

type CompactInvite = { s: string, id: Hash, inf: any, d: Array<Hash> };

const RCV_INTRO = 'invite-receiver-identity';

class Invite extends HashedObject {

    static className = 'hhs-home/v0/Invite';

    sender?        : Hash;
    senderInfo?    : any;
    senderDevices? : Array<Hash>;

    reply? : MutableReference<InviteReply>;

    constructor(sender?: Hash, secret?: string) {
        super();

        if (sender !== undefined) {
            this.sender = sender;
            this.setId(secret);
            this.addDerivedField('reply', new MutableReference<InviteReply>());
        }
        
    }

    toCompactInvite(): CompactInvite {
        return { s: this.sender, id: this.getId(), inf: this.senderInfo, d: this.senderDevices };
    }

    fromCompactInvite(i: CompactInvite) {
        this.setId(i.id);
        this.addDerivedField('reply', new MutableReference<InviteReply>());
        this.sender        = i.s;
        this.senderInfo    = i.inf;
        this.senderDevices = i.d;
    }

    getClassName(): string {
        return Invite.className;
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        return  this.sender          !== undefined &&
                typeof(this.sender)  === 'string' &&
                this.senderInfo      !== undefined &&
                HashedLiteral.valid(this.senderInfo) && 
                this.senderDevices !== undefined &&
                HashedLiteral.valid(this.senderDevices) &&
                this.checkDerivedField('reply');
    }

    senderDevicesMap() : Map<Hash, HashedLiteral> {
        return new Map(Array.from(this.senderDevices)
                            .map((deviceHash: Hash) => new HashedLiteral(deviceHash))
                            .map((literal: HashedLiteral) => [literal.hash(), literal]));
                            
    }

    senderDevicePeer(deviceHash: HashedLiteral, linkupServer: string) : Peer {
        let ep = linkupServer;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }
        ep = ep + 'invite-sender-device/' + deviceHash
        return {identityHash: this.sender, endpoint: Device.endpointForDeviceHash(deviceHash.value, linkupServer)}
    }

    senderDeviceHashForEndpoint(ep: Endpoint) : Hash {
        let deviceHash = Device.deviceHashFromEndpoint(ep);
        let literal = new HashedLiteral(deviceHash);
        return literal.hash();
    }

    receiverPeer(receiverIdentity: Hash, linkupServer: string) : Peer {
        let ep = linkupServer;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }

        let key   = this.deriveChaCha20Key();
        let nonce = new RNGImpl().randomHexString(96);

        let encIdentity = new ChaCha20Impl().encryptHex(receiverIdentity, key, nonce);
        let hmac = new HMACImpl().hmacSHA256hex(receiverIdentity, key);

        ep = ep + RCV_INTRO + '/' + encIdentity + '/' + nonce + '/' + hmac;

        return { identityHash: receiverIdentity, endpoint: ep};
    }

    receiverPeerForEndpoint(ep: Endpoint) : Peer | undefined {
        let parts = ep.split('/');

        const l = parts.length;

        if (l >= 4) {
            const hmac  = parts[l-1];
            const nonce = parts[l-2];
            const encId = parts[l-3];
            const intro = parts[l-4];

            if (intro === RCV_INTRO) {
                let id: Hash;
                try {
                    const key = this.deriveChaCha20Key();
                    id = new ChaCha20Impl().decryptHex(encId, key, nonce);
                    if (new HMACImpl().hmacSHA256hex(id, key) === hmac) {
                        return { identityHash: id, endpoint: ep };
                    }

                } catch(e) {

                }
            }
        }

        return undefined;
    }

    private deriveChaCha20Key() : string {

        const CHACHA_KEY_NIBBLES  = 256 / 4;
        const secret = this.getId();
        
        let key = "";
        while (key.length < CHACHA_KEY_NIBBLES) {
            key = key + secret;
        }

        key = key.slice(0, CHACHA_KEY_NIBBLES);

        return key;
    }

}

HashedObject.registerClass(Invite.className, Invite);

export { Invite };