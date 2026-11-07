# Namecheap DNS cutover

The Site is attached to `donteventry.me`; host and certificate validation are pending.
The user authorized the new-site cutover on 6 November 2026 (Pacific).

In Namecheap **Domain List → Manage → Advanced DNS**, replace the existing apex
(`@`) A records with the two below. Add the TXT records without changing unrelated
mail, verification, or subdomain records. Use Automatic TTL.

| Type | Host | Value |
|---|---|---|
| A | @ | 162.159.143.30 |
| A | @ | 172.66.3.26 |
| TXT | _openai-site-verification | openai-site-verification=EIPr7de3SqHaUBBZUbX1KF-b1UKBCS00u9CitwczuME |
| TXT | _cf-custom-hostname | 499a2a8e-576b-49db-82d2-bfb153da3afd |

These are public DNS verification records, not account credentials. If Namecheap
lists custom nameservers instead of BasicDNS, make the records at that nameserver
provider. Domain registration at Namecheap alone does not establish DNS hosting.

The domain attachment ID is `appgdom_6aeed0db0e148191af4747fd935da1e1` on Site
`appgprj_6aed87007ef48191b00fa10ed75fe809`. Refresh its validation status after
saving the records. Do not claim the cutover is active until the host reports it.

The shared browser could not start, so these Namecheap edits have not been made
from this workspace. The existing private Site URL remains available meanwhile.
