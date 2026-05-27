# Fortnite Maps Statistics Website — دليل المشروع المرجعي

## نظرة عامة
موقع إحصائيات لخرائط فورت نايت الإبداعية مع **تحديث لحظي حقيقي** عبر Supabase Realtime.

---

## المصدر الرسمي للبيانات: Epic Ecosystem API

```
Base URL: https://api.fortnite.com/ecosystem/v1
Docs:     https://api.fortnite.com/ecosystem/v1/docs/
```

### Endpoints المستخدمة
| Endpoint | الوصف |
|---|---|
| `GET /islands?limit=100&cursor=...` | قائمة الخرائط مع pagination |
| `GET /islands/{code}/metrics?window=last24Hours` | إحصائيات خريطة واحدة |

### حقول `/islands`
```json
{ "code": "1234-5678-9012", "creatorCode": "username", "title": "MAP NAME",
  "createdIn": "UEFN", "tags": ["pvp","boxfight"], "category": "Star Wars" }
```

### حقول `/islands/{code}/metrics`
```
peakCCU, uniquePlayers, plays, minutesPlayed, averageMinutesPerPlayer,
favorites, recommendations, retention[]{d1, d7, timestamp}
```
كل حقل عبارة عن array من `{value, timestamp}` — نأخذ القيمة الأحدث.

---

## المكدس التقني
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Realtime)
- **ORM**: Supabase JS SDK مباشرة
- **Styling**: Tailwind CSS
- **Charts**: Recharts

---

## هيكل المشروع
```
src/
  lib/
    types.ts              # كل أنواع TypeScript
    api.ts                # Epic API + Supabase queries
    sync.ts               # منطق المزامنة (fetchAllIslands + syncMetrics)
    supabase/
      client.ts           # Client-side Supabase (use client)
      server.ts           # Server-side Supabase (service role)
      database.types.ts   # TypeScript types للـ schema
  app/
    page.tsx              # الرئيسية — أفضل خرائط live
    maps/page.tsx         # تصفح مع فلترة وترتيب
    maps/[id]/page.tsx    # تفاصيل خريطة + رسوم بيانية
    search/page.tsx       # بحث في DB
    api/
      sync/islands/route.ts   # POST — مزامنة metadata من Epic
      cron/metrics/route.ts   # GET — جلب metrics (يُشغَّل كل 10 دقائق)
  components/
    MapCard.tsx           # بطاقة الخريطة (server-safe)
    RealtimeIslands.tsx   # Grid مع Supabase Realtime (use client)
    StatsChart.tsx        # رسم بياني بـ Recharts (use client)
supabase/
  schema.sql              # SQL لإنشاء الجداول والـ views
vercel.json               # Vercel Cron config
```

---

## قاعدة البيانات

### الجداول
```sql
islands(code PK, title, creator_code, created_in, tags[], category, image_url, last_synced_at)
island_metrics(id, island_code FK, recorded_at, peak_ccu, unique_players, plays,
               minutes_played, avg_minutes_per_player, favorites, recommendations,
               retention_d1, retention_d7)
```

### Views
- `latest_island_metrics` — آخر snapshot لكل خريطة
- `popular_islands` — جدول مدمج جاهز للعرض مرتب حسب peak_ccu

### تفعيل Realtime
```sql
alter publication supabase_realtime add table island_metrics;
```

---

## سير العمل (Data Flow)

```
1. [مرة واحدة] POST /api/sync/islands
   → fetchAllIslands() ← Epic /islands (paginated)
   → upsert → Supabase islands table

2. [كل 10 دقائق] GET /api/cron/metrics  (Vercel Cron)
   → syncMetrics(200) ← Epic /islands/{code}/metrics
   → INSERT → island_metrics table
   → Supabase Realtime → يُخطر RealtimeIslands.tsx
   → الواجهة تتحدث بدون reload
```

---

## متغيرات البيئة (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=       # من Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=      # Service role (server only — لا تعرضه للعميل أبداً)
CRON_SECRET=                    # أي string عشوائي لحماية routes المزامنة
```

---

## خطوات الإعداد

### 1. إنشاء مشروع Supabase
1. سجّل على [supabase.com](https://supabase.com)
2. أنشئ project جديد
3. افتح **SQL Editor** والصق محتوى `supabase/schema.sql`
4. في **Table Editor → island_metrics → Replication** → فعّل Realtime

### 2. إضافة المتغيرات
انسخ القيم من Supabase → Settings → API إلى `.env.local`

### 3. أول مزامنة
```bash
curl -X POST http://localhost:3000/api/sync/islands \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```
هذا يجلب كل الخرائط من Epic ويخزّنها. قد يستغرق 2-5 دقائق.

### 4. تشغيل أول جلب للـ metrics
```bash
curl http://localhost:3000/api/cron/metrics \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## قواعد التطوير
- كل استدعاءات Epic API في `src/lib/api.ts` فقط
- كل منطق المزامنة في `src/lib/sync.ts` فقط
- `SUPABASE_SERVICE_ROLE_KEY` يُستخدم فقط في server components و API routes
- `NEXT_PUBLIC_*` هو الوحيد المسموح للعميل
- لا mock data — استخدم Supabase للبيانات الحقيقية

## أوامر التطوير
```bash
npm install && npm run dev    # تشغيل محلي
npm run build                  # بناء
npm run lint                   # فحص
```
