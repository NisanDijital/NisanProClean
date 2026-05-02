# Release Gate

This project uses a single, strict release path.

## Workspace rule

- Use only `C:\Users\sonfi\Documents\NisanProClean`.
- Do not run release work from `New project` or temporary folders.

## Mandatory order before push/deploy

1. `npm run -s release:gate`
2. AutoQA execute run plan for `tests/smoke.spec.ts` and confirm:
   - `executed=true`
   - `status=passed`
3. `npm run -s build`

If any step fails, stop feature work and fix the failure first.

## Deploy-time checks

After deploy, run:

1. `npm run -s index:health`
2. `npm run -s release:live-check`

`release:live-check` must return `200` for:

- `/`
- `/blog/`
- `/admin.html`
- worker `/health`

## Revenue flow checklist (daily)

1. Open `admin.html` and verify:
   - `Bugun Yeni Lead`
   - `Bugun Randevu`
   - `Bildirim Hata`
2. Verify `Lead Takip Merkezi` loads and shows queue items.
3. Verify at least one WhatsApp action link opens correctly from lead queue.

## Failure handling

If gate fails:

1. Fix code/test mismatch first.
2. Re-run `release:gate`.
3. Re-run AutoQA execute.
4. Continue only after all are green.
