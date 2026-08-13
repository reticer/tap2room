# 🔐 tap2room — Security Audit & QA Test Report

> รายงานนี้แบ่งเป็น 2 ส่วน: **🔴 รายงานแฮกเกอร์** (ช่องโหว่ความปลอดภัย) และ **🟢 รายงาน Software Tester** (เช็คลิสต์ทดสอบฟังก์ชัน)

---

# 🔴 ส่วนที่ 1: Hacker Report — ช่องโหว่ความปลอดภัย

## วิธีการเจาะ (สมมุติว่าเป็นแฮกเกอร์)
1. เปิดเว็บ → กด F12 → ดู Network tab → เห็น Supabase URL + Anon Key ทันที
2. ใช้ Anon Key ที่ดูดได้มา query ข้อมูลทั้ง Database โดยตรง
3. ลองอ่าน/เขียน/ลบข้อมูลในทุกตาราง

## ผลการทดสอบ (รันจริงกับ DB ของคุณ)

### 🔴 CRITICAL — ช่องโหว่ร้ายแรง (ต้องแก้ทันที)

| # | ช่องโหว่ | รายละเอียด | ความเสี่ยง |
|---|---------|-----------|-----------|
| 1 | **อ่านออเดอร์ทุกคนได้** | คนแปลกหน้าสามารถดึงข้อมูลออเดอร์ทั้งหมดได้ รวมถึง `room_number`, `total_amount`, `tracking_code`, `phone`, `coupon_code` | 🔴 **Critical** |
| 2 | **แก้ไขสถานะออเดอร์ได้** | ผลทดสอบ: `UPDATE order status (anon): VULNERABLE!` — แฮกเกอร์สามารถเปลี่ยนสถานะออเดอร์จาก pending เป็น completed หรือ cancelled ได้เลย! | 🔴 **Critical** |
| 3 | **ลบออเดอร์ได้** | ผลทดสอบ: `DELETE orders (anon): VULNERABLE!` — แฮกเกอร์สามารถลบออเดอร์ทุกรายการออกจากระบบได้! | 🔴 **Critical** |
| 4 | **รีเซ็ตยอดใช้คูปองได้** | ผลทดสอบ: `UPDATE coupon used_count (anon): VULNERABLE!` — แฮกเกอร์สามารถรีเซ็ต `used_count` ของคูปองกลับเป็น 0 ทำให้ใช้คูปองซ้ำได้ไม่จำกัด! | 🔴 **Critical** |

> [!CAUTION]
> ช่องโหว่ข้อ 1-4 เป็นเรื่องร้ายแรงมาก! ทุกคนที่เปิด F12 แล้วก็อปปี้ Supabase URL + Anon Key ไป สามารถลบออเดอร์ แก้สถานะ หรือรีเซ็ตคูปองของคุณได้ทันที

---

### 🟠 HIGH — ข้อมูลรั่วไหล

| # | ช่องโหว่ | รายละเอียด | ความเสี่ยง |
|---|---------|-----------|-----------|
| 5 | **อ่านคูปองทั้งหมดได้** | คนแปลกหน้าเห็น `code`, `discount_value`, `discount_type`, `usage_limit`, `used_count` ของทุกคูปอง — รู้โค้ดลับทุกตัว! | 🟠 **High** |
| 6 | **อ่าน PromptPay ID ได้** | `app_settings` เปิดให้ทุกคนอ่านได้ เห็น PromptPay ID (เบอร์โทร) `0858594916` | 🟠 **High** |
| 7 | **อ่าน order_items ได้** | รายการสินค้าในแต่ละออเดอร์ อ่านได้หมด (ถ้ามีข้อมูลอยู่) | 🟠 **High** |

---

### 🟡 MEDIUM — ข้อมูลรั่วระดับกลาง

| # | ช่องโหว่ | รายละเอียด | ความเสี่ยง |
|---|---------|-----------|-----------|
| 8 | **อ่าน activity_logs ได้** | ข้อมูลกิจกรรมที่บันทึกไว้ (login, add_to_cart ฯลฯ) อ่านได้ | 🟡 Medium |
| 9 | **อ่าน customer_feedbacks ได้** | ข้อความ feedback จากลูกค้าทุกคน อ่านได้ | 🟡 Medium |
| 10 | **อ่าน push_subscriptions ได้** | Endpoint ของ Push notification subscriptions อ่านได้ | 🟡 Medium |

---

### 🔵 LOW — ช่องโหว่ระดับต่ำ / ข้อสังเกต

| # | ช่องโหว่ | รายละเอียด | ความเสี่ยง |
|---|---------|-----------|-----------|
| 11 | **Admin email ใน source code** | `admin@taptoroom.com` hardcoded ใน [AdminAuthModal.tsx](file:///C:/Users/ballo/Desktop/tap2room/src/features/admin/AdminAuthModal.tsx#L103) — แฮกเกอร์รู้ email แอดมินทันที เหลือแค่เดารหัสผ่าน | 🔵 Low |
| 12 | **VAPID Public Key ใน source code** | VAPID key อยู่ใน [pushUtils.ts](file:///C:/Users/ballo/Desktop/tap2room/src/utils/pushUtils.ts#L4) — ปกติไม่ใช่ปัญหา (public key) แต่ระวังอย่าเผย private key | 🔵 Low |
| 13 | **Edge Function ไม่มี Secret Key** | [notify_order/index.ts](file:///C:/Users/ballo/Desktop/tap2room/supabase/functions/notify_order/index.ts) ไม่มีการตรวจสอบ secret/authorization header ใครก็ส่ง POST request ได้ | 🟡 Medium |
| 14 | **ส่วนลดคำนวณฝั่ง Client** | `p_discount_amount` ส่งจากฝั่ง Client ใน [CartDrawer.tsx](file:///C:/Users/ballo/Desktop/tap2room/src/features/cart/CartDrawer.tsx#L169) — แฮกเกอร์อาจแก้ค่าส่วนลดเป็นตัวเลขสูงๆ ก่อนส่งไป DB ได้ (แม้ว่า RPC จะมี clamp ไว้ แต่ RPC ไม่ได้ validate ว่าคูปองนั้นถูกต้องจริง) | 🟠 **High** |

---

### 🔒 สิ่งที่ปลอดภัยแล้ว (ผ่านการทดสอบ)

| # | รายการ | ผลลัพธ์ |
|---|--------|--------|
| ✅ | แก้ไขราคาสินค้า (anon) | **BLOCKED** |
| ✅ | ลบสินค้า (anon) | **BLOCKED** |
| ✅ | แก้ไข store_status (anon) | **BLOCKED** |
| ✅ | สร้างออเดอร์ผ่าน direct INSERT (anon) | **BLOCKED** — ต้องผ่าน RPC เท่านั้น |
| ✅ | RPC `place_order_secure` คำนวณราคาฝั่ง server | **ปลอดภัย** |
| ✅ | Rate Limiting ล็อกอิน (3 ครั้ง = ล็อค) | **ปลอดภัย** |
| ✅ | Anti-Spam สั่งซื้อ (15 วินาที/ห้อง) | **ปลอดภัย** |

---

### 🛠 SQL สำหรับแก้ไขช่องโหว่ทั้งหมด

```sql
-- ====================================================
-- FIX: ปิดช่องโหว่ RLS สำหรับ Anonymous Users
-- ====================================================

-- 1. ตาราง orders — ห้าม anon อ่าน/แก้ไข/ลบ
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon to read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon to update orders" ON public.orders;  
DROP POLICY IF EXISTS "Allow anon to delete orders" ON public.orders;
-- อนุญาตเฉพาะ authenticated (admin)
DROP POLICY IF EXISTS "Admin can manage orders" ON public.orders;
CREATE POLICY "Admin can manage orders" ON public.orders 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Anon ไม่ได้สิทธิ์อะไรเลยกับตาราง orders (place_order_secure ใช้ SECURITY DEFINER)

-- 2. ตาราง coupons — ห้าม anon แก้ไข, อ่านได้แค่ code กับ discount
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read coupons" ON public.coupons;
CREATE POLICY "Anon can read active coupons" ON public.coupons 
  FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS "Admin can manage coupons" ON public.coupons;
CREATE POLICY "Admin can manage coupons" ON public.coupons 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ห้าม anon update/delete/insert
REVOKE UPDATE, DELETE, INSERT ON public.coupons FROM anon;

-- 3. ตาราง order_items — ห้าม anon ทุกอย่าง
DROP POLICY IF EXISTS "Admin can manage order_items" ON public.order_items;
CREATE POLICY "Admin can manage order_items" ON public.order_items 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. ตาราง activity_logs — ห้าม anon อ่าน (INSERT ยังได้)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.activity_logs;
CREATE POLICY "Anyone can insert logs" ON public.activity_logs 
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can read logs" ON public.activity_logs;
CREATE POLICY "Admin can read logs" ON public.activity_logs 
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can delete logs" ON public.activity_logs;
CREATE POLICY "Admin can delete logs" ON public.activity_logs 
  FOR DELETE TO authenticated USING (true);

-- 5. ตาราง customer_feedbacks — anon INSERT ได้ แต่อ่าน/ลบไม่ได้
ALTER TABLE public.customer_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.customer_feedbacks;
CREATE POLICY "Anyone can submit feedback" ON public.customer_feedbacks 
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can manage feedback" ON public.customer_feedbacks;
CREATE POLICY "Admin can manage feedback" ON public.customer_feedbacks 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ตาราง push_subscriptions — ห้าม anon อ่าน
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can upsert push" ON public.push_subscriptions;
CREATE POLICY "Anyone can upsert push" ON public.push_subscriptions 
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can read push" ON public.push_subscriptions;
CREATE POLICY "Admin can manage push" ON public.push_subscriptions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. REVOKE สิทธิ์ UPDATE/DELETE จาก anon สำหรับตารางสำคัญ
REVOKE UPDATE, DELETE ON public.orders FROM anon;
REVOKE UPDATE, DELETE ON public.order_items FROM anon;
REVOKE UPDATE, DELETE ON public.activity_logs FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.customer_feedbacks FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.push_subscriptions FROM anon;
```

---
---

# 🟢 ส่วนที่ 2: Software Tester Report — เช็คลิสต์ทดสอบฟังก์ชัน

## 1. หน้าร้าน (Storefront)

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| SF-01 | กรองสินค้าตามหมวดหมู่ | เลือกหมวดหมู่แล้วแสดงเฉพาะสินค้าที่ตรง, "ทั้งหมด" แสดงทุกรายการ | P1 |
| SF-02 | ทดสอบ Hidden Admin Login | แตะโลโก้ 5 ครั้งภายใน 1.5 วินาที → เปิด Modal ล็อกอินแอดมิน | P2 |
| SF-03 | สินค้าหมดสต็อก | สินค้า stock=0 เป็นสีเทา มีป้าย "สินค้าหมด" ปุ่มเพิ่มถูก disable ถูกเรียงไว้ล่างสุด | P1 |
| SF-04 | แสดงราคาลดพิเศษ | สินค้ามี `sale_price` แสดงป้าย "ราคาพิเศษ" พร้อมราคาเก่าขีดฆ่า | P2 |
| SF-05 | เพิ่มสินค้าลงตะกร้า | กด "+" → จำนวนในตะกร้าเพิ่ม, ปุ่มเปลี่ยนเป็น -/จำนวน/+ | P0 |
| SF-06 | เปลี่ยนภาษา TH/EN | กดสลับภาษา → ข้อความทั้งหน้าเปลี่ยน รวมถึงชื่อสินค้า | P1 |

---

## 2. ตะกร้าสินค้า & ชำระเงิน

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| CT-01 | ปรับจำนวนสินค้า | กด "+" เพิ่มจำนวน (ไม่เกิน stock), กด "-" ลดจำนวน (ถึง 0 = ลบออก), ราคารวมอัปเดตถูกต้อง | P0 |
| CT-02 | ใส่โค้ดส่วนลดที่ถูกต้อง | ใส่โค้ดแล้วกดใช้ → แสดงส่วนลดและราคาหลังหัก | P1 |
| CT-03 | ใส่โค้ดส่วนลดหมดอายุ/ผิด | แสดง error ว่า "โค้ดส่วนลดไม่ถูกต้อง" | P1 |
| CT-04 | โค้ดจำกัด 1 ห้อง/1 โค้ด | ห้องที่เคยใช้โค้ดแล้วจะใช้ซ้ำไม่ได้ ขึ้น error ตอนกดชำระเงิน | P1 |
| CT-05 | ชำระเงินผ่าน PromptPay | เลือก PromptPay → กดชำระ → เปิด Modal แสดง QR Code ยอดถูกต้อง | P0 |
| CT-06 | ชำระเงินแบบ COD | เลือก COD → กรอกเบอร์โทร (≥9 หลัก) → กดยืนยัน → สำเร็จ | P0 |
| CT-07 | ราคาซิงค์กับ DB | เปิดตะกร้า → ราคาสินค้าอัปเดตตาม DB ล่าสุด (กันราคาเก่าค้าง) | P1 |
| CT-08 | ต้องกรอกเลขห้อง | ไม่กรอกเลขห้องแล้วกดชำระ → ขึ้น error | P0 |

---

## 3. ติดตามออเดอร์

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| OT-01 | ดูออเดอร์ที่สั่งไป | กดปุ่ม "ออเดอร์ของฉัน" → แสดงรายการออเดอร์ที่สั่งจากเครื่องนี้ | P1 |
| OT-02 | สถานะอัปเดตแบบ Real-time | แอดมินเปลี่ยนสถานะ → หน้าลูกค้าอัปเดตทันทีโดยไม่ต้อง refresh | P1 |
| OT-03 | ออเดอร์ใหม่ขึ้นทันที | สั่งซื้อเสร็จ → กดดูออเดอร์ → ออเดอร์ใหม่อยู่บนสุด | P0 |

---

## 4. ล็อกอินแอดมิน

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| AL-01 | ล็อกอินสำเร็จ | ใส่รหัสถูก → นำทางไปหน้า `/admin` | P0 |
| AL-02 | ล็อกอินผิด 3 ครั้ง | ผิด 3 ครั้ง → ล็อคระบบ แสดงนับถอยหลัง ปุ่ม Login ถูก disable | P1 |
| AL-03 | Session persistence | ปิดแท็บแล้วเปิดใหม่ ถ้า session ยังอยู่ กดโลโก้ 5 ครั้ง → ไปหน้า admin เลย | P2 |

---

## 5. แดชบอร์ดแอดมิน

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| AD-01 | สลับเปิด-ปิดร้าน | แตะปุ่มสถานะร้าน → เปลี่ยนสีและข้อความทันที | P0 |
| AD-02 | เปิด Modal สรุปยอดขาย | กดปุ่ม "ดูรายงาน" → เปิด Analytics Island | P2 |
| AD-03 | สลับแท็บ คำสั่งซื้อ/สินค้า/ตั้งค่า | กดแท็บแต่ละอัน → แสดงเนื้อหาถูกต้อง | P2 |

---

## 6. จัดการออเดอร์ (Admin)

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| OM-01 | กรองออเดอร์ตามสถานะ | กดปุ่มสถานะ (ทั้งหมด/รอ/กำลังทำ/สำเร็จ/ยกเลิก) → กรองถูกต้อง | P2 |
| OM-02 | เปลี่ยนสถานะออเดอร์ | Pending → Preparing → Completed อัปเดตทันที | P0 |
| OM-03 | ยกเลิกออเดอร์ + คืนคูปอง | ยกเลิก → used_count ของคูปองลดลง 1, บันทึก cancelled_at | P1 |
| OM-04 | ลบออเดอร์แบบ Bulk | เปิดโหมดเลือก → เลือกหลายรายการ → กดลบ → ยืนยัน → ลบสำเร็จ | P2 |

---

## 7. จัดการสินค้า (Admin)

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| PM-01 | เพิ่มสินค้าใหม่ | กรอกครบ (ชื่อ TH/EN, ราคา, สต็อก, หมวดหมู่) → สินค้าขึ้นหน้าร้านทันที | P0 |
| PM-02 | แก้ไขสต็อกเป็น 0 | แก้ stock=0 → สินค้าเป็นสีเทาในหน้าร้านทันที | P1 |
| PM-03 | เรียงลำดับสินค้า | ลากเปลี่ยนตำแหน่ง → ลำดับหน้าร้านเปลี่ยนตาม | P2 |

---

## 8. ตั้งค่า & คูปอง (Admin)

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| SM-01 | แก้ไข PromptPay ID | เปลี่ยนเลข → QR Code ในตะกร้าอัปเดตทันที | P0 |
| SM-02 | สร้าง/แก้ไขคูปอง | ตั้งค่าประเภทส่วนลด, ขั้นต่ำ, วันหมดอายุ, จำกัดต่อห้อง → บันทึกสำเร็จ | P1 |

---

## 9. Feedback ติดต่อแอดมิน

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| FB-01 | ส่ง Feedback | กรอกข้อความ → กดส่ง → แสดงสำเร็จ, แอดมินเห็นในหน้าตั้งค่า | P2 |

---

## 10. ระบบเปิด-ปิดร้าน

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| SC-01 | หน้าร้านตอนปิด | ภาพเป็นสีเทา (grayscale 90%), opacity 70%, มีแบนเนอร์ "ขณะนี้ปิดรับออร์เดอร์ชั่วคราว" | P0 |
| SC-02 | ตะกร้าตอนร้านปิด | ปุ่มตะกร้าและ FAB หายไป กดเพิ่มสินค้าไม่ได้ | P1 |
| SC-03 | Real-time เปิด-ปิด | แอดมินกดเปิดร้าน → หน้าลูกค้ากลับมาเป็นสีปกติทันทีโดยไม่ต้อง refresh | P0 |

---

## 11. Edge Cases

| ID | รายการทดสอบ | ผลลัพธ์ที่คาดหวัง | Priority |
|----|-----------|-----------------|----------|
| EC-01 | เพิ่มสินค้าเกิน stock | ปุ่ม "+" ถูก disable เมื่อจำนวน = stock | P1 |
| EC-02 | ห้องซ้ำ prefix | พิมพ์ "ห้อง ห้อง 5" → ระบบตัด prefix ซ้ำออก | P2 |
| EC-03 | Checkout ตะกร้าว่าง | ไม่สามารถกดชำระเงินได้ แสดง empty state | P2 |
| EC-04 | อักขระพิเศษใน note | emoji, เครื่องหมายคำพูด ฯลฯ ไม่ทำให้ระบบพัง | P2 |
| EC-05 | สั่งซื้อซ้ำภายใน 15 วินาที | ถูกป้องกัน (rate limiting ใน RPC) | P1 |
