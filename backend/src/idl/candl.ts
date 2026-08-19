/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/candl.json`.
 */
export type Candl = {
  "address": "JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa",
  "metadata": {
    "name": "candl",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.nft_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "traderPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolTreasury",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shareAmount",
          "type": "u64"
        },
        {
          "name": "maxSolCost",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "SOL reserve. Never `init`ed as a data account -- the handler below",
            "seeds it with the rent-exempt minimum directly, since a bare",
            "SystemAccount holding a nonzero balance below that threshold makes",
            "Solana reject the whole transaction (this is what small early buys",
            "hit before this seeding existed: see docs/15-decisions.md ADR #5).",
            "The seed is refunded to `creator` in `force_redeem` once the market",
            "is fully settled (see force_redeem.rs)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "docs": [
            "Holds the deposited NFT. Its own PDA address doubles as its SPL",
            "token authority -- outgoing transfers (at settlement) sign with",
            "these same seeds via CPI."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "nftMint"
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "duration",
          "type": "i64"
        }
      ]
    },
    {
      "name": "extendMarket",
      "discriminator": [
        105,
        89,
        206,
        205,
        57,
        31,
        153,
        252
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.nft_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "market"
          ]
        }
      ],
      "args": [
        {
          "name": "extensionSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "forceRedeem",
      "discriminator": [
        121,
        237,
        203,
        72,
        208,
        140,
        141,
        130
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.nft_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "traderPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "trader",
          "docs": [
            "instruction. Only ever credited lamports (never debited), and",
            "trader_position's seeds already tie this exact pubkey to a real,",
            "existing position, so it can't be swapped for an arbitrary account."
          ],
          "writable": true
        },
        {
          "name": "caller",
          "docs": [
            "Whoever is triggering this redemption on the trader's behalf. Only",
            "pays the transaction fee -- never receives or redirects any funds."
          ],
          "signer": true
        },
        {
          "name": "escrow",
          "docs": [
            "Only touched if this redemption drains the market to zero supply,",
            "returning the NFT to its creator (docs/04-market-lifecycle.md)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "nftMint"
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "creator",
          "docs": [
            "(the vault's rent-exempt seed from create_market.rs, refunded here",
            "once the market is fully settled)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeProtocol",
      "discriminator": [
        188,
        233,
        252,
        106,
        134,
        146,
        202,
        91
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "curveAlpha",
          "type": "u64"
        },
        {
          "name": "curveBeta",
          "type": "u64"
        },
        {
          "name": "protocolFeeBps",
          "type": "u16"
        },
        {
          "name": "creatorFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "sell",
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.nft_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "bondingCurve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "traderPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "trader"
              }
            ]
          }
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolTreasury",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shareAmount",
          "type": "u64"
        },
        {
          "name": "minSolOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settle",
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.nft_mint",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "bondingCurve",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  99,
                  117,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bondingCurve",
      "discriminator": [
        23,
        183,
        248,
        55,
        96,
        216,
        172,
        96
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    },
    {
      "name": "traderPosition",
      "discriminator": [
        190,
        176,
        116,
        92,
        24,
        60,
        209,
        198
      ]
    }
  ],
  "events": [
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketExtended",
      "discriminator": [
        67,
        165,
        253,
        192,
        45,
        189,
        179,
        47
      ]
    },
    {
      "name": "marketSettled",
      "discriminator": [
        237,
        212,
        22,
        175,
        201,
        117,
        215,
        99
      ]
    },
    {
      "name": "sharesRedeemed",
      "discriminator": [
        232,
        166,
        7,
        56,
        67,
        19,
        42,
        117
      ]
    },
    {
      "name": "tradeExecuted",
      "discriminator": [
        41,
        110,
        64,
        129,
        60,
        79,
        179,
        80
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mathOverflow",
      "msg": "Curve math overflowed"
    },
    {
      "code": 6001,
      "name": "feeTooHigh",
      "msg": "Fee configuration exceeds protocol maximum"
    },
    {
      "code": 6002,
      "name": "invalidDuration",
      "msg": "Market duration is outside protocol bounds"
    },
    {
      "code": 6003,
      "name": "extensionTooLong",
      "msg": "Market extension exceeds the maximum allowed per call"
    },
    {
      "code": 6004,
      "name": "marketNotActive",
      "msg": "Market is not in the Active state"
    },
    {
      "code": 6005,
      "name": "marketNotSettling",
      "msg": "Market is not in the Settling state"
    },
    {
      "code": 6006,
      "name": "marketExpired",
      "msg": "Market has already expired"
    },
    {
      "code": 6007,
      "name": "marketNotExpired",
      "msg": "Market has not expired yet"
    },
    {
      "code": 6008,
      "name": "zeroShareAmount",
      "msg": "Share amount must be greater than zero"
    },
    {
      "code": 6009,
      "name": "slippageExceeded",
      "msg": "Trade would exceed the provided slippage tolerance"
    },
    {
      "code": 6010,
      "name": "insufficientShares",
      "msg": "Trader does not hold enough shares for this action"
    },
    {
      "code": 6011,
      "name": "notCreator",
      "msg": "Only the market creator may perform this action"
    },
    {
      "code": 6012,
      "name": "notNftOwner",
      "msg": "Signer does not hold the NFT being deposited"
    },
    {
      "code": 6013,
      "name": "reserveInvariantViolated",
      "msg": "Reserve does not match the expected curve invariant"
    }
  ],
  "types": [
    {
      "name": "bondingCurve",
      "docs": [
        "Stores the mathematical state of the market. There is no virtual",
        "reserve: `real_sol_reserves` must always exactly equal",
        "`reserve(outstanding_shares)` (docs/03-economics.md)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "curveType",
            "type": {
              "defined": {
                "name": "curveType"
              }
            }
          },
          {
            "name": "outstandingShares",
            "type": "u64"
          },
          {
            "name": "realSolReserves",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "curveType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "cubic"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "The core account representing a single NFT market.",
        "docs/06-smart-contracts.md"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "feeProtocolBps",
            "docs": [
              "Snapshotted from ProtocolConfig at creation time so a later",
              "governance change never retroactively alters a running market."
            ],
            "type": "u16"
          },
          {
            "name": "feeCreatorBps",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "duration",
            "type": "i64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "marketState"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketExtended",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "newExpiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "finalReserve",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "settling"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "docs": [
        "Singleton account holding the protocol-wide curve and fee parameters.",
        "docs/03-economics.md: \"these percentages apply uniformly across all",
        "markets\" -- fees and the curve shape are not a per-market choice in V1."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "curveAlpha",
            "docs": [
              "Reserve(S) = curve_alpha * S^3 + curve_beta * S, both fixed-point",
              "scaled by CURVE_SCALE (see constants.rs)."
            ],
            "type": "u64"
          },
          {
            "name": "curveBeta",
            "type": "u64"
          },
          {
            "name": "protocolFeeBps",
            "type": "u16"
          },
          {
            "name": "creatorFeeBps",
            "type": "u16"
          },
          {
            "name": "authority",
            "docs": [
              "Governance authority: can update this config, and receives protocol",
              "fees as the protocol treasury (V1 simplification -- one account",
              "serves both roles instead of introducing a separate treasury PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sharesRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "solReceived",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tradeExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "solAmount",
            "type": "u64"
          },
          {
            "name": "shareAmount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "feePaid",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "traderPosition",
      "docs": [
        "One trader's share balance in one market. Shares are not SPL tokens",
        "(docs/15-decisions.md ADR #2) -- this account is the balance ledger."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bondingCurveSeed",
      "type": "bytes",
      "value": "[98, 111, 110, 100, 105, 110, 103, 95, 99, 117, 114, 118, 101]"
    },
    {
      "name": "curveScale",
      "docs": [
        "Fixed-point scale for `ProtocolConfig.curve_alpha` / `curve_beta`.",
        "A stored value of `1_000_000` represents the real number `0.001`",
        "(matching the example in docs/03-economics.md), i.e.",
        "`real_value = raw_value / CURVE_SCALE`."
      ],
      "type": "u128",
      "value": "1000000000"
    },
    {
      "name": "escrowSeed",
      "type": "bytes",
      "value": "[101, 115, 99, 114, 111, 119]"
    },
    {
      "name": "marketSeed",
      "type": "bytes",
      "value": "[109, 97, 114, 107, 101, 116]"
    },
    {
      "name": "maxExtensionSeconds",
      "type": "i64",
      "value": "2592000"
    },
    {
      "name": "maxMarketDurationSeconds",
      "type": "i64",
      "value": "2592000"
    },
    {
      "name": "maxTotalFeeBps",
      "docs": [
        "docs/03-economics.md: total fee is 1.25%, split 0.95% protocol / 0.30% creator."
      ],
      "type": "u16",
      "value": "1000"
    },
    {
      "name": "minMarketDurationSeconds",
      "type": "i64",
      "value": "86400"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "protocolConfigSeed",
      "type": "bytes",
      "value": "[112, 114, 111, 116, 111, 99, 111, 108, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
