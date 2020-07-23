import { HashedObject, PeerSource, GenericPeerSource, Endpoint } from 'hyper-hyper-space';
import { Identity } from 'hyper-hyper-space';
import { MutableSet } from 'hyper-hyper-space';
import { LinkupManager } from 'hyper-hyper-space';
import { Device } from './Device';

class Account extends HashedObject {

    static className = 'hhs-home/v0/Account';
    
    identity?: Identity;
    devices?: MutableSet<Device>;

    //deviceInfo?: Map<Hash, MutableMap<String, HashedObject>>;

    // Variables starting with an underscore are transient,
    // they're not serialized and stored, nor used for hashing
    // the object.
    _localDevice?: Device;
    _accountDevicesPeerSource?: PeerSource;

    constructor(identity?: Identity) {
        super();

        if (identity !== undefined) {
            this.identity = identity;
            this.addDerivedField('devices', new MutableSet<Device>());
        }
        
    }

    getClassName(): string {
        return Account.className;
    }

    init() {

    }

    validate(references: Map<string, HashedObject>): boolean {
        references;
        return this.identity !== undefined && this.devices !== undefined && 
               this.identity.equals(this.devices.getAuthor());
    }

    async sync() {
        let deviceHash = this.getResources()?.config.deviceHash;

        if (this.devices === undefined) {
            throw new Error('Devices set is missing from Account.');
        }

        let mesh = this.getResources()?.mesh;

        if (mesh === undefined) {
            throw new Error('Account cannot connect, the mesh is missing from provided resources.');
        }

        this.devices.loadAndWatchForChanges();

        this._localDevice = await this.getStore().load(deviceHash) as Device;

        // create a PeerSource that will feed all the account's devices into a PeerGroup.

        this._accountDevicesPeerSource = new GenericPeerSource<Device>(
            (d: Device) => d.asPeer(LinkupManager.defaultLinkupServer),
            (ep: Endpoint) => Device.deviceHashFromEndpoint(ep),
            [this.devices]
        );
        
        this.getMesh().joinPeerGroup(
                            this.accountDevicesPeerGroupId(),
                            this._localDevice.asPeer(LinkupManager.defaultLinkupServer),
                            this._accountDevicesPeerSource); 

        this.syncObjectWithAccountDevices(this);
    }

    syncObjectWithAccountDevices(object: HashedObject, recursive=true, gossipId?: string) {
        this.getMesh().syncObjectWithPeerGroup(this.accountDevicesPeerGroupId(), object, recursive, gossipId);
    }

    private accountDevicesPeerGroupId() {
        return 'hhs-home-' + this.identity?.hash() + '-devices';
    }
}

export { Account };