use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TailscaleDevice {
    pub hostname: String,
    #[serde(rename = "tailscaleIPs")]
    pub tailscale_ips: Vec<String>,
    pub online: bool,
    pub os: String,
    #[serde(rename = "isCurrentDevice")]
    pub is_current_device: bool,
}

// Matches the shape of `tailscale status --json` (abbreviated).
#[derive(Deserialize)]
struct TailscaleStatus {
    #[serde(rename = "Self")]
    myself: Option<TailscalePeer>,
    #[serde(rename = "Peer")]
    peers: Option<HashMap<String, TailscalePeer>>,
}

#[derive(Deserialize)]
struct TailscalePeer {
    #[serde(rename = "HostName")]
    host_name: String,
    #[serde(rename = "TailscaleIPs")]
    tailscale_ips: Option<Vec<String>>,
    #[serde(rename = "Online")]
    online: bool,
    #[serde(rename = "OS")]
    os: String,
}

pub async fn get_devices() -> Vec<TailscaleDevice> {
    let output = tokio::process::Command::new("tailscale")
        .args(["status", "--json"])
        .output()
        .await;

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => return vec![],
    };

    let status: TailscaleStatus = match serde_json::from_slice(&output.stdout) {
        Ok(s) => s,
        Err(_) => return vec![],
    };

    let mut devices: Vec<TailscaleDevice> = vec![];

    if let Some(myself) = status.myself {
        devices.push(TailscaleDevice {
            hostname: myself.host_name,
            tailscale_ips: myself.tailscale_ips.unwrap_or_default(),
            online: myself.online,
            os: myself.os,
            is_current_device: true,
        });
    }

    if let Some(peers) = status.peers {
        let mut peer_list: Vec<TailscaleDevice> = peers
            .into_values()
            .map(|p| TailscaleDevice {
                hostname: p.host_name,
                tailscale_ips: p.tailscale_ips.unwrap_or_default(),
                online: p.online,
                os: p.os,
                is_current_device: false,
            })
            .collect();
        peer_list.sort_by(|a, b| a.hostname.cmp(&b.hostname));
        devices.extend(peer_list);
    }

    devices
}
