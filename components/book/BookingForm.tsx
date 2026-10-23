"use client";

import { Fragment, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CalendarBlank, Camera, ChatText, EnvelopeSimple, Phone, Image as ImageIcon, CaretDown, CaretLeft, CaretRight, Check, LockSimple, MapPin, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { business } from "@/lib/business";
import { dict, href, money, price, duration, servicesIn, type Lang } from "@/lib/i18n";
import { MOUNT } from "@/lib/services";
import { depositOn } from "@/lib/booking/deposit";
import { on } from "@/lib/preview";
import { mountFlow } from "@/lib/book/flow";
import { Wordmark } from "@/components/site/Wordmark";

/**
 * Booking. One form, two ways to use it.
 *
 * As rendered on the server it is a single honest form: every field visible,
 * a date and an arrival time, posted to /api/book, which answers with a
 * redirect to the confirmation page or back here to #send-error.
 *
 * Once the page is live, lib/book/flow.ts turns the same fields into five
 * steps: several services with a running total, live availability on a month
 * calendar, a soft address check, and a deposit card field when a deposit is
 * configured. It runs once; this component never re-renders its markup.
 */
export function BookingForm({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const b = t.book;
  // Tax rates as the page's language writes them ("9.975%" / "9,975 %").
  const pct = (rate: number) => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "percent", maximumFractionDigits: 3 }).format(rate);
  const services = servicesIn(lang);
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);
  const cancel = business.booking.cancellationHours;
  // The deposit rule (lib/business.ts): flat $50 now, the 20% rule archived.
  const deposit = depositOn();
  const flatDeposit = business.booking.depositMode === "flat";
  const clock = (h: number) => new Intl.DateTimeFormat(t.locale, { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(Date.UTC(2026, 0, 5, h)));

  useEffect(() => {
    if (started.current || !form.current) return;
    started.current = true;
    mountFlow(form.current, {
        lang,
        googleKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
        square: {
          appId: process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? "",
          locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "",
          production: process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production",
        },
      });
  }, [lang]);

  return (
    <>
      <div id="send-error" className="alert" role="alert" tabIndex={-1}>
        <WarningCircle size={22} weight="light" aria-hidden />
        <div>
          <p className="alert__t">{b.confirm.errorTitle}</p>
          <p data-error-text>{b.confirm.errorBody}</p>
        </div>
      </div>

      <div className="book__grid">
        <form ref={form} className="flow" method="post" action="/api/book">
          <input type="hidden" name="lang" value={lang} />
          <ol className="progress" aria-label={b.stepsLabel}>
            {b.steps.map((s, i) => (
              <li key={s} data-progress={i}>
                <button type="button" className="progress__btn" data-progress-go={i}><span className="num">{i + 1}</span><em>{s}</em></button>
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite" data-step-announce />
          <p className="remembered" data-remembered aria-live="polite" hidden>{b.remember.welcome} <button type="button" className="link" data-forget>{b.remember.forget}</button></p>

          {/* 1 · Service */}
          <fieldset className="step" data-step="0">
            <legend className="step__title d3" tabIndex={-1}>{b.titles[0]}</legend>
            {on("multiCar") && (
              /* How many cars first (test copy only, lib/preview.ts): with 2 or 3, every list goes compact. */
              <div className="cars" data-cars>
                <div className="cars__pick">
                  <span id="cars-label" className="cars__label">{b.cars.legend}</span>
                  <div className="pills" role="radiogroup" aria-labelledby="cars-label">
                    {["1", "2", "3", "4"].map((n) => (
                      <label key={n} className="pill"><input type="radio" name="cars" value={n} defaultChecked={n === "1"} /><span>{n === "4" ? b.cars.many : n}</span></label>
                    ))}
                  </div>
                </div>
                <span className="help">{b.cars.help}</span>
                <p className="cars__many" data-cars-many hidden>{b.cars.manyNote} <a href={`tel:${business.phone.tel}`}>{business.phone.display}</a></p>
                <p className="err" data-err="carsMany">{b.cars.errMany}</p>
              </div>
            )}
            <p className="help step__help">{b.service.help}</p>
            <div className="choices">
              {services.map((s) => (
                <Fragment key={s.slug}>
                <label className="choice">
                  <input type="checkbox" name="service" value={s.slug} />
                  <span className="choice__name">{s.name}{s.sub && <em className="choice__sub">{s.sub}</em>}</span>
                  <span className="choice__meta num">{price(lang, s)} · {duration(lang, s.minutes)}</span>
                  <span className="choice__tick" aria-hidden="true"><Check size={14} weight="bold" /></span>
                </label>
                {s.slug === "tire-install" && (
                  <>
                  {/* Tyres mounted on their rims: priced by rim size, like the price list. */}
                  <div className="tireopts" data-tire-opts>
                    <div className="field">
                      <span id="rim-label">{b.tire.legend}</span>
                      <div className="pills" role="radiogroup" aria-labelledby="rim-label">
                        {MOUNT.tiers.map((r) => (
                          <label key={r.rim} className="pill"><input type="radio" name="rim" value={r.rim} /><span>{`${t.fmt.rims[r.rim]} · ${money(lang, r.price)}`}</span></label>
                        ))}
                        <label className="pill"><input type="radio" name="rim" value="unknown" /><span>{`${b.tire.unknown} · ${money(lang, Math.max(...MOUNT.tiers.map((r) => r.price)))}`}</span></label>
                      </div>
                    </div>
                    <label className="remember tireopts__rf"><input type="checkbox" name="runflat" /><span>{b.tire.runFlat}</span></label>
                    <p className="help">{b.tire.help}</p>
                    <p className="err" data-err="rim">{b.tire.err}</p>
                  </div>
                  </>
                )}
                </Fragment>
              ))}
            </div>
            {on("multiCar") && (
              <>
                {[2, 3].map((n) => (
                  <fieldset key={n} className="car" data-car={n} hidden>
                    <legend className="car__title">{b.cars.servicesFor(n)}</legend>
                    <div className="car__list">
                      {services.filter((s) => s.slug !== "tire-install").map((s) => (
                        <label key={s.slug} className="pill"><input type="checkbox" name={`car${n}Service`} value={s.slug} /><span>{s.name}</span></label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <p className="help cars__tires" data-cars-tires hidden>{b.cars.tiresNote}</p>
                <p className="err" data-err="carServices">{b.cars.errServices}</p>
              </>
            )}
            <p className="total" data-total aria-live="polite" />
            <p className="price-notice">{b.confirm.priceNotice}</p>
            <p className="err" data-err="service">{b.invalid.service}</p>
          </fieldset>

          {/* 2 · Where */}
          <fieldset className="step" data-step="1">
            <legend className="step__title d3" tabIndex={-1}>{b.titles[1]}</legend>
            <label className="field">
              <span>{b.where.address}</span>
              {on("addressSuggest") ? (
                <span className="addr">
                  <input className="input" name="address" type="text" autoComplete="street-address" required role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="addr-list" />
                  <ul className="addr__list" id="addr-list" role="listbox" aria-label={b.coverage.suggest} data-addr-list hidden />
                </span>
              ) : (
                <input className="input" name="address" type="text" autoComplete="street-address" required />
              )}
              <span className="help">{b.where.addressHelp}</span>
              <span className="cover" data-cover aria-live="polite" />
            </label>
            <p className="err" data-err="address">{b.invalid.address}</p>
            <label className="field field--short">
              <span>{b.where.postal}</span>
              <input className="input" name="postal" type="text" autoComplete="postal-code" autoCapitalize="characters" inputMode="text" maxLength={7} placeholder="H9W 5L6" required />
            </label>
            <p className="err" data-err="postal">{b.invalid.postal}</p>
            <div className="field">
              <span id="parking-label">{b.where.parking}</span>
              <div className="pills" role="radiogroup" aria-labelledby="parking-label">
                {b.where.parkingOptions.map((o, i) => (
                  <label key={o} className="pill"><input type="radio" name="parking" value={o} required data-office={i === b.where.parkingOptions.length - 1 ? "" : undefined} /><span>{o}</span></label>
                ))}
              </div>
              <span className="help">{b.where.parkingHelp}</span>
            </div>
            <input type="hidden" name="parkingConsent" value="" />
            <p className="err" data-err="parking">{b.invalid.parking}</p>
            <p className="err" data-err="parkingConsent" role="alert">{b.office.blocked}</p>
            <p className="err" data-err="outside" role="alert">
              {b.outside.blocked} <a className="link num" href={`tel:${business.phone.tel}`}>{business.phone.display}</a>
            </p>

            {/* Office or business lot: the customer confirms the property's permission. */}
            <dialog className="notice" data-office-dialog aria-labelledby="office-title">
              <div className="notice__head">
                <WarningCircle size={22} weight="fill" aria-hidden />
                <h3 className="notice__title" id="office-title">{b.office.title}</h3>
                <button type="button" className="notice__x" data-office-close aria-label={b.office.close}>×</button>
              </div>
              <p>{b.office.body}</p>
              <ul className="notice__points">
                {b.office.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
              <p><a className="link" href={t.pages.officeDoc.href} target="_blank" rel="noopener" download>{b.office.doc}</a></p>
              <label className="notice__agree"><input type="checkbox" data-office-agree /><span>{b.office.agree}</span></label>
              <div className="notice__actions">
                <button type="button" className="btn btn--ghost" data-office-close>{b.office.close}</button>
                <button type="button" className="btn btn--red" data-office-accept disabled>{b.office.accept}</button>
              </div>
            </dialog>

            {/* Outside the area: book by phone instead. */}
            <dialog className="notice" data-outside-dialog aria-labelledby="outside-title">
              <div className="notice__head">
                <MapPin size={22} weight="fill" aria-hidden />
                <h3 className="notice__title" id="outside-title">{b.outside.title}</h3>
                <button type="button" className="notice__x" data-outside-close aria-label={b.office.close}>×</button>
              </div>
              <p>{b.outside.body}</p>
              <p className="notice__phone num"><a className="link" href={`tel:${business.phone.tel}`}>{business.phone.display}</a> · <a className="link" href={`mailto:${business.email}`}>{business.email}</a></p>
              <div className="notice__actions">
                <a className="btn btn--red" href={`tel:${business.phone.tel}`}><Phone size={16} weight="bold" aria-hidden />{b.outside.call}</a>
                <a className="btn btn--ghost" href={`sms:${business.phone.tel}`}><ChatText size={16} weight="bold" aria-hidden />{b.outside.text}</a>
                <a className="btn btn--ghost" href={`mailto:${business.email}?subject=${encodeURIComponent(b.outside.emailSubject)}`}><EnvelopeSimple size={16} weight="bold" aria-hidden />{b.outside.email}</a>
              </div>
              <button type="button" className="link notice__change" data-outside-close data-outside-change>{b.outside.change}</button>
            </dialog>
          </fieldset>

          {/* 3 · When */}
          <fieldset className="step" data-step="2">
            <legend className="step__title d3" tabIndex={-1}>{b.titles[2]}</legend>
            <div className="when" data-when hidden>
              <p className="when__status" data-when-status>{b.when.loading}</p>
              <div className="pick" data-cal hidden>
                <div className="cal">
                  <div className="cal__head">
                    <button className="cal__nav" type="button" data-cal-prev aria-label={b.when.prevMonth}><CaretLeft size={18} weight="light" aria-hidden /></button>
                    <p className="cal__month" data-cal-month aria-live="polite" />
                    <button className="cal__nav" type="button" data-cal-next aria-label={b.when.nextMonth}><CaretRight size={18} weight="light" aria-hidden /></button>
                  </div>
                  <div className="cal__grid" data-cal-grid role="group" aria-label={b.plain.date} />
                </div>
                <div className="pick__side">
                  <p className="pick__day" data-day-label />
                  <div className="windows" data-windows role="radiogroup" aria-label={b.plain.window} />
                </div>
              </div>
              <p className="when__preview" data-preview hidden><span className="tag">{t.draft}</span> {b.when.preview}</p>
              <p className="when__long" data-longjob hidden />
              <input type="hidden" name="startAt" />
              <input type="hidden" name="segments" />
            </div>
            {/* Plain: a date and an arrival time. Disabled once enhanced. */}
            <fieldset className="plain" data-plain>
              <p className="help">{b.plain.help}</p>
              <label className="field">
                <span>{b.plain.date}</span>
                <input className="input" name="date" type="date" required />
              </label>
              <div className="pills" role="radiogroup" aria-label={b.plain.window}>
                {business.booking.arrivals.map((h, i) => (
                  <label key={h} className="pill"><input type="radio" name="window" value={h} defaultChecked={i === 0} /><span className="num">{clock(h)}</span></label>
                ))}
              </div>
            </fieldset>
            <p className="help">{b.when.notice}</p>
            <p className="err" data-err="slot">{b.invalid.slot}</p>
            <p className="err" data-err="taken">{b.confirm.taken}</p>
          </fieldset>

          {/* 4 · You */}
          <fieldset className="step" data-step="3">
            <legend className="step__title d3" tabIndex={-1}>{b.titles[3]}</legend>
            <div className="grid2">
              <label className="field span2"><span>{b.you.name}</span><input className="input" name="name" autoComplete="name" required /></label>
              <p className="err span2" data-err="name">{b.invalid.name}</p>
              <label className="field"><span>{b.you.phone}</span><input className="input" name="phone" type="tel" autoComplete="tel" inputMode="tel" required /></label>
              <label className="field"><span>{b.you.email}</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
              <p className="err" data-err="phone">{b.invalid.phone}</p>
              <p className="err" data-err="email">{b.invalid.email}</p>
            </div>
            <label className="field">
              <span>{b.you.vin} <em className="opt" data-vin-opt>({b.you.optional})</em><em className="opt" data-vin-req hidden>({b.you.vinRequired})</em></span>
              <input className="input" name="vin" maxLength={17} autoCapitalize="characters" spellCheck={false} />
              <span className="help">{b.you.vinHelp}</span>
            </label>
            <p className="err" data-err="vin">{b.invalid.vin}</p>
            <div className="scan" data-vin-scan hidden>
              <label className="btn btn--ghost btn--sm scan__btn">
                <Camera size={18} weight="light" aria-hidden />
                {b.you.vinScan}
                <input className="sr-only" type="file" accept="image/*" data-vin-photo />
              </label>
              <span className="help scan__status" data-vin-status aria-live="polite" />
            </div>
            <div className="grid3">
              <label className="field"><span>{b.you.year} <em className="opt">({b.you.optional})</em></span><input className="input" name="year" inputMode="numeric" maxLength={4} /></label>
              <label className="field"><span>{b.you.make}</span><input className="input" name="make" required /></label>
              <label className="field"><span>{b.you.model}</span><input className="input" name="model" required /></label>
              <p className="err" data-err="make">{b.invalid.make}</p>
              <p className="err" data-err="model">{b.invalid.model}</p>
            </div>
            {on("multiCar") && (
              <div className="cars-more" data-cars-more hidden>
                <h3 className="cars-more__title">{b.cars.detailsTitle}</h3>
                <p className="help">{b.cars.detailsHelp}</p>
                {[2, 3].map((n) => (
                  <fieldset key={n} className="car car--details" data-car-details={n} hidden>
                    <legend className="car__title">{b.cars.car(n)}</legend>
                    <label className="field">
                      <span>{b.you.vin} <em className="opt">({b.you.vinRequired})</em></span>
                      <input className="input" name={`car${n}Vin`} maxLength={17} autoCapitalize="characters" spellCheck={false} />
                      <span className="help">{b.cars.vinFills}</span>
                    </label>
                    <div className="scan">
                      <label className="btn btn--ghost btn--sm scan__btn">
                        <Camera size={18} weight="light" aria-hidden />
                        {b.you.vinScan}
                        <input className="sr-only" type="file" accept="image/*" data-car-vin-photo />
                      </label>
                      <span className="help scan__status" data-car-vin-status aria-live="polite" />
                    </div>
                    <div className="grid3">
                      <label className="field"><span>{b.you.year} <em className="opt">({b.you.optional})</em></span><input className="input" name={`car${n}Year`} inputMode="numeric" maxLength={4} /></label>
                      <label className="field"><span>{b.you.make}</span><input className="input" name={`car${n}Make`} /></label>
                      <label className="field"><span>{b.you.model}</span><input className="input" name={`car${n}Model`} /></label>
                    </div>
                  </fieldset>
                ))}
                <p className="err" data-err="carDetails">{b.cars.errDetails}</p>
              </div>
            )}
            <label className="field">
              <span>{b.you.notes} <em className="opt">({b.you.optional})</em></span>
              <textarea className="input" name="notes" rows={3} />
              <span className="help">{b.you.notesHelp}</span>
            </label>
            <div className="field photos" data-photos hidden>
              <span id="photos-label">{b.you.photos} <em className="opt">({b.you.optional})</em></span>
              <ul className="photos__list" data-photo-list aria-labelledby="photos-label" />
              <label className="btn btn--ghost btn--sm scan__btn photos__add">
                <ImageIcon size={18} weight="light" aria-hidden />
                {b.you.photosAdd}
                <input className="sr-only" type="file" accept="image/*" multiple data-photo-input />
              </label>
              <span className="help">{b.you.photosHelp}</span>
              <span className="help" data-photo-status aria-live="polite" />
              <input type="hidden" name="photos" />
            </div>
            <label className="remember" data-remember hidden>
              <input type="checkbox" name="remember" />
              <span>{b.remember.label}<span className="help">{b.remember.help}</span></span>
            </label>
          </fieldset>

          {/* 5 · Review and pay: the booking as a receipt (left), payment (right) */}
          <fieldset className="step co" data-step="4">
            <legend className="step__title d3" tabIndex={-1}>{b.titles[4]}</legend>
            <button type="button" className="co__back link" data-goto="3"><ArrowLeft size={15} weight="bold" aria-hidden />{b.back}</button>
            <div className="co__grid">
              <section className="co__booking" aria-label={b.summary} data-co-booking>
                <button type="button" className="co__toggle" aria-expanded="false" aria-controls="co-receipt" data-co-toggle>
                  <span>{b.summary}</span>
                  <span className="co__toggle-due num" data-co-due-mini />
                  <CaretDown size={16} weight="bold" aria-hidden />
                </button>
                <div className="co__receipt" id="co-receipt">
                  <div className="co__brand"><Wordmark /></div>
                  <div className="co__appt">
                    <p className="co__when"><CalendarBlank size={18} weight="bold" aria-hidden /><strong className="num" data-review-v="2" /></p>
                    <p className="co__where"><MapPin size={18} weight="bold" aria-hidden /><span data-review-v="1" /></p>
                    <button type="button" className="co__edit link" data-goto="2">{b.edit}</button>
                  </div>
                  <div className="co__block">
                    <ul className="co__items" data-co-items />
                    <p className="co__dur" data-review-v="0" />
                    <button type="button" className="co__edit link" data-goto="0">{b.edit}</button>
                  </div>
                  <dl className="co__rows">
                    <div><dt>{b.confirm.summary[3]}</dt><dd data-review-v="3" /><dd><button type="button" className="co__edit link" data-goto="3">{b.edit}</button></dd></div>
                    <div><dt>{b.confirm.summary[4]}</dt><dd data-review-v="4" /><dd><button type="button" className="co__edit link" data-goto="3">{b.edit}</button></dd></div>
                  </dl>
                  <fieldset className="notify" aria-describedby="notify-help">
                    <legend className="notify__legend">{b.confirm.notify}</legend>
                    <div className="notify__opts">
                      <label className="notify__opt"><input type="checkbox" name="notifyEmail" defaultChecked /><span><EnvelopeSimple size={17} weight="light" aria-hidden />{b.confirm.notifyEmail}</span></label>
                      <label className="notify__opt"><input type="checkbox" name="notifyText" defaultChecked /><span><ChatText size={17} weight="light" aria-hidden />{b.confirm.notifyText}</span></label>
                    </div>
                    <span className="help" id="notify-help">{b.confirm.notifyHelp}</span>
                    <p className="err" data-err="notify">{b.invalid.notify}</p>
                  </fieldset>
                  <dl className="co__totals">
                    <div><dt>{b.confirm.payEstimate}</dt><dd className="num" data-pay-estimate /></div>
                    {flatDeposit ? null : (
                      <>
                        <div><dt>{b.confirm.payGst(pct(business.tax.gst))}</dt><dd className="num" data-pay-gst /></div>
                        <div><dt>{b.confirm.payQst(pct(business.tax.qst))}</dt><dd className="num" data-pay-qst /></div>
                        <div><dt>{b.confirm.payWithTax}</dt><dd className="num" data-pay-with-tax /></div>
                      </>
                    )}
                    {deposit ? (
                      <>
                        <div className="co__due"><dt>{b.confirm.payTitle}</dt><dd className="num" data-pay-deposit /></div>
                        {flatDeposit ? null : <div className="co__later"><dt>{b.confirm.payLater}</dt><dd>{b.confirm.payLaterValue}</dd></div>}
                      </>
                    ) : null}
                  </dl>
                  {deposit && flatDeposit ? <p className="co__note">{b.confirm.payLaterFlat}</p> : null}
                </div>
              </section>

              <section className="co__pay" aria-labelledby="pay-title" data-deposit>
                <header className="co__pay-head">
                  <h3 className="co__pay-title" id="pay-title">{deposit ? b.confirm.card : b.confirm.sendTitle}</h3>
                  {deposit ? <p className="co__pay-amount num" data-pay-amount aria-live="polite" /> : null}
                </header>
                <p className="co__pay-hint">{!deposit ? b.confirm.depositUnset : flatDeposit ? b.confirm.payHintFlat : b.confirm.payHint(business.booking.depositPercent ?? 0)}</p>
                <div className="card co__methods" data-card hidden>
                  <div className="wallets" data-wallets hidden>
                    <button type="button" id="apple-pay" className="wallet wallet--apple" aria-label="Apple Pay" hidden />
                    <div id="google-pay" className="wallet" hidden />
                    <p className="wallets__or"><span>{b.confirm.cardOr}</span></p>
                  </div>
                  <div id="card-field" className="card__field" />
                  <p className="co__accepted">{b.confirm.cardAccepted}</p>
                </div>
                <p className="price-notice price-notice--co">{b.confirm.priceNotice}</p>
                <label className="co__accept">
                  <input type="checkbox" name="acceptTerms" required />
                  <span>
                    {b.confirm.acceptPre} <a className="link" href={href(lang, "/legal/terms")} target="_blank">{b.confirm.acceptTerms}</a> {b.confirm.acceptAnd} <a className="link" href={href(lang, "/legal/warranty")} target="_blank">{b.confirm.acceptWarranty}</a>.{" "}
                    <a className="link soft" href={lang === "en" ? "/docs/renn-bros-terms-fr.pdf" : "/docs/renn-bros-terms.pdf"} target="_blank" lang={lang === "en" ? "fr" : "en"}>{b.confirm.acceptFr}</a>
                  </span>
                </label>
                <p className="err" data-err="terms" role="alert">{b.invalid.terms}</p>
                <button className="btn btn--red co__submit" type="submit" data-submit>{b.confirm.submit}</button>
                <p className="co__secure">
                  <LockSimple size={15} weight="bold" aria-hidden />
                  <span>{b.confirm.paySecure}</span>
                  <a className="link" href={href(lang, "/legal/terms")} target="_blank">{b.confirm.policy}</a>
                </p>
                <ol className="co__next" aria-label={b.confirm.nextTitle}>
                  {b.confirm.next.map((n) => <li key={n}>{n}</li>)}
                </ol>
              </section>
            </div>
          </fieldset>

          {/* Square refused the booking (or the system failed): no dead end. */}
          <dialog className="notice" data-fail-dialog aria-labelledby="fail-title">
            <div className="notice__head">
              <WarningCircle size={22} weight="fill" aria-hidden />
              <h3 className="notice__title" id="fail-title">{b.failed.title}</h3>
              <button type="button" className="notice__x" data-fail-close aria-label={b.failed.close}>×</button>
            </div>
            <p>{b.failed.body}</p>
            <p className="notice__phone num"><a className="link" href={`tel:${business.phone.tel}`}>{business.phone.display}</a></p>
            <div className="notice__actions">
              <a className="btn btn--ghost" href={`sms:${business.phone.tel}`}><ChatText size={16} weight="bold" aria-hidden />{b.failed.text}</a>
              <a className="btn btn--red" href={`tel:${business.phone.tel}`}>{b.failed.call} · <span className="num">{business.phone.display}</span></a>
            </div>
          </dialog>

          <div className="nav" data-nav>
            <button className="btn btn--ghost" type="button" data-back hidden><ArrowLeft size={16} weight="bold" aria-hidden />{b.back}</button>
            <button className="btn btn--red" type="button" data-next hidden>{b.next}<ArrowRight size={16} weight="bold" className="arrow" aria-hidden /></button>
          </div>
        </form>

        <aside className="summary" aria-label={b.summary}>
          <div className="summary__card">
            <p className="label">{b.summary}</p>
            <p className="summary__service d4" data-sum-service>—</p>
            <p className="summary__price num" data-sum-price />
            <ul className="summary__facts">
              <li><MapPin size={18} weight="light" aria-hidden /><span data-sum-where>{b.travel}</span></li>
              <li><CalendarBlank size={18} weight="light" aria-hidden /><span data-sum-when>{b.when.notice}</span></li>
              <li><ShieldCheck size={18} weight="light" aria-hidden /><span>{t.business.warranty}</span></li>
            </ul>
          </div>
          <div className="summary__talk">
            <p>{b.ratherTalk}</p>
            <a className="link num" href={`tel:${business.phone.tel}`}>{business.phone.display}</a>
          </div>
        </aside>
      </div>
    </>
  );
}
