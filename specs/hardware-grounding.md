# Hardware Grounding

| Function | Hardware / OS grounding |
|---|---|
| Compute | CPU / SoC |
| Persistent initialization data | firmware storage |
| Hardware initialization | BIOS / UEFI |
| Boot transition | EFI boot manager / boot program |
| Execution management | kernel |
| State transport | system interconnect / bus |
| Durable storage | SSD / filesystem |
| Local I/O | device/controller interfaces |
| Active work | process/runtime |
| Added capability | driver/module/plugin |

A storage medium stores an executable image; the executable component is not the storage medium.
