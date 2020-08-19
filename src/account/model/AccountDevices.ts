import { Identity, MutableSet, HashedObject, Resources } from 'hyper-hyper-space';

import { Device } from './Device';
import { LinkupServer } from './LinkupServer';


class AccountDevices extends HashedObject {

    static className = 'hhs-home/v0/AccountDevices';

    owner?: Identity;

    devices?: MutableSet<Device>;
    linkupServers?: MutableSet<LinkupServer>;

    constructor(owner?: Identity) {
        super();

        if (owner !== undefined) {
            this.owner = owner;

            this.setId('account-devices-for-' + owner.hash());

            const devices = new MutableSet<Device>();
            devices.setAuthor(owner);
            this.addDerivedField ('devices', devices);
            
            const linkupServers = new MutableSet<LinkupServer>();
            linkupServers.setAuthor(owner);
            this.addDerivedField('linkupServers', linkupServers);
        }
    }

    getClassName(): string {
        return AccountDevices.className;
    }

    init(): void {
        
    }

    validate(references: Map<string, HashedObject>): boolean {
        references;

        return this.owner !== undefined &&
               this.devices !== undefined &&
               this.linkupServers !== undefined &&
               this.owner instanceof Identity &&
               this.devices instanceof MutableSet &&
               this.linkupServers instanceof MutableSet &&
               this.owner.equals(this.devices?.getAuthor()) &&
               this.owner.equals(this.linkupServers?.getAuthor()) && 
               this.checkDerivedField('devices') &&
               this.checkDerivedField('linkupServers');

    }

    setResources(resources: Resources) {
        super.setResources(resources);

        this.devices?.setResources(resources);
        this.linkupServers?.setResources(resources);
    }

    getDevices() {
        if (this.devices === undefined) {
            throw new Error('AccountDevices has not been initialized: devices is undefined.');
        } else {
            return this.devices;
        }
    }

    getLinkupServers() {
        if (this.linkupServers === undefined) {
            throw new Error('AccountDevices has not been initialized: linkupServers is undefined.');
        } else {
             return this.linkupServers;
        }
    }
    
}

HashedObject.registerClass(AccountDevices.className, AccountDevices);

export { AccountDevices };