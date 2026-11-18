# Namecheap DNS cutover

The Site is attached to `donteventry.me`; domain routing and SSL were confirmed
active by Sites on November 14, 2026. No DNS change is needed for this update.
The user confirmed ChatGPT Sites hosting on 6 November 2026 (Pacific).
The temporary GitHub Pages/separate-backend adaptation was cancelled. The app,
accounts, progress, D1 database and private R2 backups stay together on Sites.
These verification values supersede the earlier, removed domain attachment.

The following records document the completed Namecheap cutover. Keep the current
records, including unrelated mail and subdomain records. The ownership TXT
value begins with the initial `o` in `openai-site-verification=`.

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
`appgprj_6aed87007ef48191b00fa10ed75fe809`. Sites reports the domain and its SSL certificate active.

The user completed the Namecheap edits. The generated Sites URL also remains
available: https://double-advanced-classroom.framedegret8.chatgpt.site/ .
