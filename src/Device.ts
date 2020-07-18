import { HashedObject, Identity, Endpoint, Peer } from 'hyper-hyper-space';

class Device extends HashedObject {

    static className = 'hhs-home/v0/Device';

    constructor(owner?: Identity) {
        super();
        this.setRandomId();
        if (owner !== undefined) {
            this.setAuthor(owner);
        }
    }

    getClassName(): string {
        return Device.className;
    }

    init(): void {
        
    }
    
    validate(references: Map<string, HashedObject>): boolean {
        references;
        return this.getAuthor() !== undefined;
    }

    asPeer(linkupServer: string): Peer {
        return { endpoint: this.endpoint(linkupServer), identityHash: this.getAuthor()?.hash() };
    }

    private endpoint(linkupServer: string) {
        let ep = linkupServer;
        if (!ep.endsWith('/')) {
            ep = ep + '/';
        }
        return ep + 'device/' + this.hash();
    }

    static deviceHashFromEndpoint(ep: Endpoint) {
        let parts = ep.split('/device/');
        if (parts.length !== 2) {
            throw new Error('Endpoint does not look like a Device endpoint!');
        }

        return parts[1];
    }

}

HashedObject.registerClass(Device.className, Device);

export { Device };
