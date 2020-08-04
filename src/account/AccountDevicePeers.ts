import { PeerSource, Shuffle, PeerInfo, LinkupManager } from 'hyper-hyper-space';

import { AccountInfo } from './AccountInfo';
import { Device } from './Device';



class AccountDevicePeers implements PeerSource {

    accountInfo: AccountInfo;

    constructor(accountInfo: AccountInfo) {
        this.accountInfo = accountInfo;
    }

    async getPeers(count: number): Promise<PeerInfo[]> {
        
        let devices = Array.from(this.accountInfo.devices.values());
        Shuffle.array(devices);

        if (devices.length > count) {
            devices = devices.slice(0, count);
        }

        return devices.map((d: Device) => d.asPeer(this.accountInfo.getLinkupServer()));
        
    }

    async getPeerForEndpoint(endpoint: string): Promise<PeerInfo | undefined> {
        let hash = Device.deviceHashFromEndpoint(endpoint);

        let device = this.accountInfo.devices.get(hash);

        let pi = undefined;

        if (device !== undefined) {
            pi = device.asPeer(this.accountInfo.getLinkupServer());
        }

        return pi;
    }

}

export { AccountDevicePeers };