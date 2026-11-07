# Namecheap DNS cutover

The Site is attached to `donteventry.me`; host and certificate validation are pending.
The user confirmed ChatGPT Sites hosting on 6 November 2026 (Pacific).
The temporary GitHub Pages/separate-backend adaptation was cancelled. The app,
accounts, progress, D1 database and private R2 backups stay together on Sites.
These verification values supersede the earlier, removed domain attachment.

In Namecheap **Domain List → Manage → Advanced DNS**, replace the existing apex
(`@`) A records with the two below. Add the TXT records without changing unrelated
mail, verification, or subdomain records. Remove old website apex AAAA records
so IPv6 visitors do not reach the old host. Use Automatic TTL.

| Type | Host | Value |
|---|---|---|
| A | @ | 162.159.143.30 |
| A | @ | 172.66.3.26 |
| TXT | _openai-site-verification | openai-site-verification=oa2nSdP0rBmNgb9Qtnl4GOuGfvbLwLRgtPHqOUvHMLY |
| TXT | _cf-custom-hostname | 9b5f9dc2-0af9-48fd-aff5-542dc9222d16 |

These are public DNS verification records, not account credentials. If Namecheap
lists custom nameservers instead of BasicDNS, make the records at that nameserver
provider. Domain registration at Namecheap alone does not establish DNS hosting.

The domain attachment ID is `appgdom_6aeed3f460248191a727097b1146e752` on Site
`appgprj_6aed87007ef48191b00fa10ed75fe809`. Refresh its validation status after
saving the records. Do not claim the cutover is active until the host reports it.

The shared browser could not start, so these Namecheap edits have not been made
from this workspace. The existing private Site URL remains available meanwhile.
