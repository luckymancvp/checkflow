-- =====================================================================
-- Audit case "hientt": 10 đơn cần sửa nhưng chỉ 1 đơn trong bảng orders.
-- Mục tiêu: tìm nguyên nhân (designer name mismatch, thiếu row trong orders, …)
-- Chạy từng block riêng.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Danh sách 10 đơn NEED REPAIR do hientt mark (theo order_history).
--    Xem item_id, google_sheet_id, time mark.
-- ---------------------------------------------------------------------
SELECT
  item_id,
  google_sheet_id,
  CASE WHEN google_sheet_id = '__mera__' THEN 'mera' ELSE 'sheet' END AS source,
  change_type,
  created_at
FROM order_history
WHERE status = 'NEED REPAIR'
  AND designer = 'hientt'
ORDER BY created_at DESC;

item_id,google_sheet_id,source,change_type,created_at
IRC-4079917946-5104691865,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-08 10:16:56.852+00
IRC-4079917946-5094098442,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-08 10:16:20.809+00
DAV-4078788810-5092653814,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 09:30:22.222+00
IRC-4079611404-5104355021,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-08 08:21:26.445+00
IRCI-4079721678-5093847302,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-08 07:45:30.012+00
DAV-4078446596-5103037585,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 07:02:42.433+00
DAV-4077993340-5102527267,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 06:54:35.764+00
DAV-4077993340-5091630658,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 06:53:57.745+00
DAV-4077993340-5091630656,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 06:53:04.376+00
DAV-4077201587-5084693840,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-08 06:45:40.681+00
DAV-4078419854-5103007035,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-06 07:48:54.146+00
DAV-4081351735-5090629304,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-06-05 10:35:15.28+00
IRCI-4078015973-5097432219,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-02 07:27:52.434+00
IRC-4077935467-5097329267,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-06-02 07:25:12.417+00
IRCI-4071372881-5088919715,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-27 07:38:42.326+00
IRC-4066755726-5090092947,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 08:57:47.501+00
IRC-4072566163-5077723184,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 08:22:22.13+00
IRC-4071779553-5076546316,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 08:21:10.029+00
IRC-4072566163-5077723184,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 03:48:54.727+00
IRCI-4066834174-5077401830,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 03:48:50.759+00
IRC-4072568341-5077726498,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-26 03:29:50.224+00
IRCI-4067113600-5090497745,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:21:39.129+00
IRC-4072566163-5077723184,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:19:01.187+00
IRCI-4066834174-5077401830,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:17:44.24+00
IRC-4071779553-5076546316,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:14:44.419+00
IRCI-4071372881-5088919715,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:11:03.946+00
IRC-4071333937-5075882542,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 10:06:11.059+00
IRCI-4066061788-5089334583,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 06:26:58.84+00
IRC-4064588830-5087611341,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 06:24:02.513+00
IRC-4065197710-5075294336,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-25 04:45:25.107+00
IRCI-4064973632-5088102621,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,customer_change,2026-05-25 04:44:31.341+00
IRCI-4064611934-5087640321,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-23 04:48:10.344+00
IRC-4062332812-5084673689,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-21 08:33:04.175+00
IRC-4062332812-5084673689,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 09:15:48.581+00
IRCI-4067557517-5070919162,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 06:38:56.535+00
IRCI-4067978103-5084529957,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:05:31.956+00
IRCI-4061945126-5071083620,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:03:29.078+00
IRCI-4061945126-5071083622,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:03:01.566+00
IRCI-4061945126-5071083623,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:02:28.859+00
IRCI-4061945126-5071083625,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:01:58.364+00
IRCI-4061945126-5071083626,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:01:27.297+00
IRCI-4061945126-5071083627,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 04:00:39.03+00
IRCI-4061945126-5071083621,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 03:53:04.488+00
IRCI-4061945126-5071083628,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-20 03:38:58.098+00
IRCI-4058379866-5079264917,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-16 07:02:10.588+00
IRCI-4064026215-5079420583,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-16 05:05:25.821+00
DAV-4059152443-5060520668,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-13 09:03:21.727+00
DAV-4059152443-5060520668,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-12 09:31:30.849+00
DAV-4059152443-5060520668,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-11 09:30:24.484+00
DAV-4053738608-5060263290,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-11 09:29:58.89+00
DAV-4053849010-5072900029,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-11 09:21:17.727+00
DAV-4053756380-5072789167,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-11 09:20:43.469+00
DAV-4051566404-5070078013,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-11 09:10:23.836+00
DAV-4047384822-5052224252,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-06 09:56:41.577+00
DAV-4046250586-5063427011,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-05-06 02:24:29.257+00
IRCI-4043089258-5059445971,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-04 07:27:13.593+00
IRC-4047746235-5045713584,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-04 07:19:50.201+00
IRC-4042963126-5059295337,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 03:02:02.259+00
IRC-4042871806-5059187771,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:58:14.44+00
IRCI-4042741326-5046320398,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:56:25.447+00
IRC-4042584516-5058855083,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:54:18.044+00
IRC-4042506828-5058764207,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:48:30.278+00
IRC-4047746235-5045713584,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:46:23.697+00
IRC-4042229740-5058447211,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:45:38.073+00
IRC-4047513439-5045426322,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:41:35.555+00
IRC-4039571078-5055037911,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:35:42.744+00
IRC-4044246257-5053902691,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-05-02 02:35:00.576+00
IRCI-3999836470-4989867284,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-03-14 08:31:35.657+00
IRCI-3999793842-4989812924,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2026-03-14 08:30:06.207+00
DAM-3978086438-4962097980,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2026-02-23 07:52:09.959+00
DAC-3917329125-4890562637,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-15 07:29:31.452+00
DAL-3916178019-4889154507,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 11:08:35.898+00
DAL-3914313473-4886893421,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 11:03:45.137+00
DAL-3914214653-4870741768,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 10:56:09.737+00
DAL-3912854665-4885147521,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 09:09:04.127+00
DAL-3903086154-4867972108,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 04:39:01.822+00
DAL-3902158600-4882113345,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-13 01:29:42.569+00
DAL-3904472194-4885563243,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-12 09:48:32.949+00
DAC-3901086392-4880553933,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-12-12 09:48:06.217+00
IRCI-3891059786-4866523797,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-07 11:12:28.826+00
IRCE-3877557386-4847270217,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-05 12:03:41.454+00
IRCI-3893494403-4861504361,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-04 07:18:13.558+00
IRC-3887332594-4848433990,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-04 07:17:34.327+00
IRC-3894150329-4849267782,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-04 06:50:46.061+00
IRCI-3879776428-4838706332,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-04 04:40:03.293+00
IRC-3887852283-4842078200,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-03 02:24:59.508+00
IRC-3885883035-4851902601,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-12-02 10:02:24.709+00
DAL-3870153087-4832033909,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-25 12:45:39.647+00
DAC-3870450925-4823062072,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-25 12:42:55.251+00
DAC-3870450925-4823062072,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-25 02:34:25.677+00
DAC-3870522449-4823138442,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-21 13:06:48.943+00
DAC-3870450925-4823062072,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-21 13:06:33.5+00
DAL-3870153087-4832033909,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-21 10:39:56.965+00
DAC-3857080305-4815182471,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-11-11 09:03:23.094+00
IRC-3845664659-4793308026,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-11-03 10:26:46.625+00
IRC-3845664659-4793308026,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-11-03 09:49:55.076+00
IRCI-3786534463-4715103774,1513SRg-C1NVmPVBgNIJzmvUjVI1lrvyhVJ0VmttsS2Y,sheet,design_error,2025-10-29 08:34:18.401+00
IRCI-3786534463-4715103774,1513SRg-C1NVmPVBgNIJzmvUjVI1lrvyhVJ0VmttsS2Y,sheet,design_error,2025-10-29 08:06:04.7+00
IRCI-3811628261-4746207764,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-10-02 07:59:15.26+00
DAV-3791020304-4724068052,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-12 10:01:26.579+00
IRC-3791822145-4720873274,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,design_error,2025-09-11 07:14:41.834+00
DAV-3794106897-4723535062,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-09 09:04:05.806+00
DAV-3794102629-4734248815,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-09 09:03:10.224+00
DAV-3786869822-4718561478,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-05 11:19:58.378+00
DAV-3786926502-4718637034,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-05 11:17:42.674+00
DAV-3789994235-4729152859,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-05 08:11:44.526+00
DAV-3789938767-4718841338,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-05 08:03:20.689+00
DAV-3787907013-4716624948,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-04 08:42:14.885+00
DAV-3785980620-4717379928,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-03 13:38:52.763+00
DAV-3788570203-4727394803,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-03 13:36:56.27+00
DAV-3777192154-4706149160,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-03 12:41:25.928+00
DAV-3781896448-4712022770,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-03 11:20:15.833+00
DAL-3784499017-4722215445,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-01 02:50:08.172+00
DAV-3781919844-4712051980,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-01 02:42:16.394+00
DAL-3784215317-4712058700,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-01 02:37:52.033+00
DAV-3781896448-4712022770,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-01 02:36:53.493+00
DAV-3784022193-4711781014,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-09-01 02:32:31.944+00
DAV-3782364129-4709371360,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-08-29 09:32:36.571+00
DAV-3782364129-4709371360,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-08-29 09:31:20.521+00
DAV-3778859528-4718409343,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-08-29 09:22:33.604+00
DAV-3782364129-4709371360,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,design_error,2025-08-29 08:12:25.912+00
-- ---------------------------------------------------------------------
-- 2. Với các item_id của hientt ở (1), xem trong bảng `orders` chúng có
--    tồn tại không, và designer được ghi là ai.
--    Nếu cột `orders_designer` ≠ 'hientt' → đúng là designer name mismatch.
--    Nếu NULL → đơn KHÔNG có trong `orders` (có thể là Mera, hoặc orders chưa sync).
-- ---------------------------------------------------------------------
WITH hientt_items AS (
  SELECT DISTINCT item_id, google_sheet_id
  FROM order_history
  WHERE status = 'NEED REPAIR' AND designer = 'hientt'
)
SELECT
  h.item_id,
  h.google_sheet_id,
  CASE WHEN h.google_sheet_id = '__mera__' THEN 'mera' ELSE 'sheet' END AS source,
  o.designer    AS orders_designer,
  o.status      AS orders_current_status,
  CASE WHEN o.item_id IS NULL THEN 'MISSING in orders' ELSE 'present' END AS presence
FROM hientt_items h
LEFT JOIN orders o
  ON o.item_id = h.item_id
 AND o.google_sheet_id = h.google_sheet_id
ORDER BY presence DESC, h.item_id;

item_id,google_sheet_id,source,orders_designer,orders_current_status,presence
DAC-3857080305-4815182471,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAC-3870450925-4823062072,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAC-3870522449-4823138442,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAC-3901086392-4880553933,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAC-3917329125-4890562637,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3784215317-4712058700,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAL-3784499017-4722215445,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAL-3870153087-4832033909,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3902158600-4882113345,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3903086154-4867972108,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,REPAIRED,present
DAL-3904472194-4885563243,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3912854665-4885147521,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3914214653-4870741768,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3914313473-4886893421,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAL-3916178019-4889154507,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAM-3978086438-4962097980,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-3777192154-4706149160,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3778859528-4718409343,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3781896448-4712022770,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3781919844-4712051980,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3782364129-4709371360,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3784022193-4711781014,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3785980620-4717379928,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3786869822-4718561478,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3786926502-4718637034,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3787907013-4716624948,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3788570203-4727394803,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3789938767-4718841338,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3789994235-4729152859,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3791020304-4724068052,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3794102629-4734248815,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-3794106897-4723535062,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4046250586-5063427011,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4047384822-5052224252,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4051566404-5070078013,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4053738608-5060263290,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4053756380-5072789167,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,SEND MOCKUP,present
DAV-4053849010-5072900029,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4059152443-5060520668,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,SEND MOCKUP,present
DAV-4077201587-5084693840,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,CONFIRMED,present
DAV-4077993340-5091630656,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4077993340-5091630658,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4077993340-5102527267,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4078419854-5103007035,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4078446596-5103037585,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4078788810-5092653814,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
DAV-4081351735-5090629304,1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ,sheet,hientt,NEED REPAIR,present
IRC-3791822145-4720873274,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRC-3845664659-4793308026,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRC-3885883035-4851902601,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-3887332594-4848433990,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-3887852283-4842078200,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,,CONFIRMED,present
IRC-3894150329-4849267782,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4039571078-5055037911,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4042229740-5058447211,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4042506828-5058764207,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4042584516-5058855083,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,minhlq,CONFIRMED,present
IRC-4042871806-5059187771,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4042963126-5059295337,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,minhlq,CONFIRMED,present
IRC-4044246257-5053902691,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,WAITING CUSTOMER,present
IRC-4047513439-5045426322,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4047746235-5045713584,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4062332812-5084673689,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4064588830-5087611341,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4065197710-5075294336,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4066755726-5090092947,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4071333937-5075882542,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4071779553-5076546316,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4072566163-5077723184,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4072568341-5077726498,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRC-4077935467-5097329267,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRC-4079611404-5104355021,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRC-4079917946-5094098442,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRC-4079917946-5104691865,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRCE-3877557386-4847270217,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-3786534463-4715103774,1513SRg-C1NVmPVBgNIJzmvUjVI1lrvyhVJ0VmttsS2Y,sheet,hientt,NEED REPAIR,present
IRCI-3811628261-4746207764,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
IRCI-3879776428-4838706332,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-3891059786-4866523797,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-3893494403-4861504361,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-3999793842-4989812924,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-3999836470-4989867284,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4042741326-5046320398,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,minhlq,CONFIRMED,present
IRCI-4043089258-5059445971,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4058379866-5079264917,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4061945126-5071083620,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,SEND MOCKUP,present
IRCI-4061945126-5071083621,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4061945126-5071083622,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4061945126-5071083623,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4061945126-5071083625,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4061945126-5071083626,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4061945126-5071083627,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,SEND MOCKUP,present
IRCI-4061945126-5071083628,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRCI-4064026215-5079420583,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,ducbv,CONFIRMED,present
IRCI-4064611934-5087640321,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4064973632-5088102621,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4066061788-5089334583,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4066834174-5077401830,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4067113600-5090497745,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4067557517-5070919162,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4067978103-5084529957,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,tuanhp,WAITING CUSTOMER,present
IRCI-4071372881-5088919715,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,SEND MOCKUP,present
IRCI-4078015973-5097432219,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,CONFIRMED,present
IRCI-4079721678-5093847302,1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg,sheet,hientt,NEED REPAIR,present
-- ---------------------------------------------------------------------
-- 3. Toàn bộ biến thể tên designer cho các đơn ở (1) — so giữa 2 bảng.
--    Nếu thấy 1 đơn có history.designer='hientt' nhưng orders.designer='Hieu Tran Trung'
--    → mismatch tên. Hoặc orders.designer NULL → chưa được gán.
-- ---------------------------------------------------------------------
WITH hientt_items AS (
  SELECT DISTINCT item_id, google_sheet_id
  FROM order_history
  WHERE status = 'NEED REPAIR' AND designer = 'hientt'
)
SELECT
  o.designer        AS orders_designer,
  COUNT(*)          AS item_count
FROM hientt_items h
LEFT JOIN orders o
  ON o.item_id = h.item_id
 AND o.google_sheet_id = h.google_sheet_id
GROUP BY o.designer
ORDER BY item_count DESC;

orders_designer,item_count
hientt,91
tuanhp,8
minhlq,3
,1
ducbv,1
-- ---------------------------------------------------------------------
-- 4. Tổng quan toàn DB: các biến thể tên designer trùng nhau khi normalize
--    (kết hợp cả 2 bảng order_history + orders).
-- ---------------------------------------------------------------------
WITH all_names AS (
  SELECT 'order_history' AS src, designer
  FROM order_history
  WHERE designer IS NOT NULL
  UNION ALL
  SELECT 'orders' AS src, designer
  FROM orders
  WHERE designer IS NOT NULL
),
grouped AS (
  SELECT
    LOWER(BTRIM(designer)) AS norm_key,
    designer,
    src,
    COUNT(*) AS n
  FROM all_names
  GROUP BY 1, 2, 3
)
SELECT
  norm_key,
  array_agg(DISTINCT designer || ' (' || src || ')') AS variants_and_source,
  SUM(n) AS total_rows
FROM grouped
GROUP BY norm_key
HAVING COUNT(DISTINCT designer) > 1
ORDER BY total_rows DESC
LIMIT 30;

norm_key,variants_and_source,total_rows
duonglt,"[""duonglt (order_history)"",""Duonglt (order_history)"",""duonglt (orders)"",""Duonglt (orders)""]",8060
ducbv,"[""ducbv (order_history)"",""Ducbv (order_history)"",""ducbv (orders)"",""Ducbv (orders)""]",5040
-- ---------------------------------------------------------------------
-- 5. Có designer name nào trong order_history (NEED REPAIR) mà KHÔNG hề
--    xuất hiện trong bảng `orders`? Đây là tập designer luôn ra mẫu số = 0.
-- ---------------------------------------------------------------------
SELECT DISTINCT oh.designer
FROM order_history oh
WHERE oh.status = 'NEED REPAIR'
  AND oh.designer IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.designer = oh.designer
  )
ORDER BY oh.designer;
designer
anhttn