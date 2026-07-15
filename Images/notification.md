# INCIDENT REPORT · SUPABASE CAPACITY DISRUPTION
**June 30 – July 13, 2026**

---

## SUMMARY

Between **June 30 and July 13**, Supabase experienced widespread capacity constraints across multiple regions. These issues directly affected **Singularity Lab’s authentication services**, resulting in intermittent **login failures** for some users.

**We sincerely apologize.** Reliable access is fundamental, and we take full responsibility for the disruption this caused.

---

## IMPACTED SERVICES

- **Authentication & login**
- Project creation
- Database restarts and resizes
- Branching and restore operations

---

## IMPACTED REGIONS

- `ap-northeast-1` / `ap-northeast-2`
- `ap-south-1`
- `ap-southeast-1` / `ap-southeast-2`
- `eu-central-2` / `eu-north-1`
- `sa-east-1`
- `us-east-1` / `us-east-2`

---

## TIMELINE

**Jun 30**  
Incident identified. Capacity gradually restored in most regions.

**Jul 1–2**  
Elevated error rates persisted. Retries recommended.

**Jul 3–6**  
Recovery advanced. Older Postgres versions faced tighter constraints.

**Jul 8**  
Authentication and core operations stabilized across most regions.

**Jul 13**  
Incident fully resolved. Capacity has remained stable since.

---

## MITIGATIONS

- Upgrading to **Postgres ≥ 17.6.1.121** unlocks additional machine types and significantly improves reliability
- Existing running projects were unaffected unless **restarted, resized, upgraded, or authenticated** during the incident
- Users who experienced login failures should now be able to sign in normally

If issues persist, contact our support team.

---

## STATUS

**RESOLVED · All systems operational**
