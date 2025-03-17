export const vyosConfig = {
  firewall: {
    "global-options": {
      "state-policy": {
        established: {
          action: "accept",
        },
        invalid: {
          action: "drop",
        },
        related: {
          action: "accept",
        },
      },
    },
    group: {
      "interface-group": {
        LAN: {
          interface: ["eth1"],
        },
        WAN: {
          interface: ["eth0"],
        },
      },
      "network-group": {
        "NET-INSIDE-v4": {
          network: ["192.168.0.0/24"],
        },
      },
    },
    ipv4: {
      forward: {
        filter: {
          rule: {
            "100": {
              action: "jump",
              destination: {
                group: {
                  "network-group": "NET-INSIDE-v4",
                },
              },
              "inbound-interface": {
                group: "WAN",
              },
              "jump-target": "OUTSIDE-IN",
            },
          },
        },
      },
      input: {
        filter: {
          rule: {
            "20": {
              action: "jump",
              destination: {
                port: "22",
              },
              "jump-target": "VyOS_MANAGEMENT",
              protocol: "tcp",
            },
            "30": {
              action: "accept",
              icmp: {
                "type-name": "echo-request",
              },
              protocol: "icmp",
              state: ["new"],
            },
            "40": {
              action: "accept",
              destination: {
                port: "53",
              },
              protocol: "tcp_udp",
              source: {
                group: {
                  "network-group": "NET-INSIDE-v4",
                },
              },
            },
            "50": {
              action: "accept",
              source: {
                address: "127.0.0.0/8",
              },
            },
          },
        },
      },
      name: {
        "OUTSIDE-IN": {
          "default-action": "drop",
        },
        VyOS_MANAGEMENT: {
          rule: {
            "15": {
              action: "accept",
              "inbound-interface": {
                group: "LAN",
              },
            },
            "20": {
              action: "drop",
              "inbound-interface": {
                group: "WAN",
              },
              recent: {
                count: "4",
                time: "minute",
              },
              state: ["new"],
            },
            "21": {
              action: "accept",
              "inbound-interface": {
                group: "WAN",
              },
              state: ["new"],
            },
          },
        },
      },
    },
  },
  interfaces: {
    ethernet: {
      eth0: {
        address: ["77.90.39.119/24"],
        description: "MGMT",
        "hw-id": "bc:24:11:3d:df:d4",
        mtu: "1500",
      },
      eth1: {
        address: ["192.168.0.1/24"],
        description: "LAN",
      },
    },
    loopback: {
      lo: {},
    },
    firewall: {
      group: {
        "interface-group": {
          LAN: {
            interface: ["eth1"],
          },
          WAN: {
            interface: ["eth0"],
          },
        },
        "network-group": {
          "NET-INSIDE-v4": {
            network: ["192.168.0.0/24"],
          },
        },
      },
    },
  },
  nat: {
    source: {
      rule: {
        "100": {
          "outbound-interface": {
            name: "eth0",
          },
          source: {
            address: "192.168.0.0/24",
          },
          translation: {
            address: "masquerade",
          },
        },
      },
    },
  },
  protocols: {
    static: {
      route: {
        "0.0.0.0/0": {
          "next-hop": {
            "77.90.39.96": {},
          },
        },
      },
    },
  },
  service: {
    "dhcp-server": {
      "shared-network-name": {
        LAN: {
          subnet: {
            "192.168.0.0/24": {
              "default-router": "192.168.0.1",
              "domain-name": "vyos.net",
              lease: "86400",
              "name-server": ["192.168.0.1"],
              range: {
                "0": {
                  start: "192.168.0.9",
                  stop: "192.168.0.254",
                },
              },
            },
          },
        },
      },
    },
    dns: {
      forwarding: {
        "allow-from": ["192.168.0.0/24"],
        "cache-size": "0",
        "listen-address": ["192.168.0.1"],
      },
    },
    ntp: {
      "allow-client": {
        address: ["0.0.0.0/0", "::/0"],
      },
      server: {
        "time1.vyos.net": {},
        "time2.vyos.net": {},
        "time3.vyos.net": {},
      },
    },
    ssh: {
      "client-keepalive-interval": "180",
      "disable-password-authentication": {},
      port: ["22"],
    },
  },
  system: {
    "config-management": {
      "commit-revisions": "100",
    },
    conntrack: {
      modules: {
        ftp: {},
        h323: {},
        nfs: {},
        pptp: {},
        sip: {},
        sqlnet: {},
        tftp: {},
      },
    },
    console: {
      device: {
        ttyS0: {
          speed: "115200",
        },
      },
    },
    "host-name": "vyos-test",
    login: {
      user: {
        vyos: {
          authentication: {
            "encrypted-password":
              "$6$rounds=656000$mK5KQsD7.N.DKgA/$Ja8t3mV0fhd3gxvj8Gs4oj4wcYA/ThuNLVz.Um6X5GSu8TsU8zKrDAwuS4S82BdMcy0mnZYg5TTVE6d1gG2WD0",
            "public-keys": {
              "admin@win10": {
                key: "AAAAB3NzaC1yc2EAAAADAQABAAABAQCW/4r5OAhMMfYgRKaM1btP3K/nZkKTyFImPd5UijFGE2zaA0II66s1q7c0tpQWWS/FqJzyzTjo3Qh+dxAus6080lCnDVx5MgW5q+rI7HnCrY6zSe8y839xurZ/jqXLHFWWP1bfyN3lDO7k1iEvUdu+2WhZHyfE9mDQWf7NbSS9CxSMDkwQVmCLGrYBWH+QZJz2+GJxmJwR78Rr891r2ClysCoRZCx9ULBLFsGh1AGz7bPjmZoN4TTgbDfxo0gbbclErn0XpIKM3ThZopgGjtEN7Ejdnb1EtCcWHGhkYmZYSk2UKngaG/cr/z3Yipuo1qW1LJAwtPgCEsbE96iuYy/L",
                type: "ssh-rsa",
              },
            },
          },
        },
      },
    },
    syslog: {
      global: {
        facility: {
          all: {
            level: "info",
          },
          local7: {
            level: "debug",
          },
        },
      },
    },
  },
}

