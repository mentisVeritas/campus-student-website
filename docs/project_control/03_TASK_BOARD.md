# TASK BOARD (SINGLE SOURCE OF TRUTH)

Статусы: `TODO` / `IN_PROGRESS` / `DONE` / `BLOCKED`  
Главное правило: пока не завершен весь блок `MUST`, нельзя переходить к `SHOULD` и `COULD`.

## TODAY MISSION
- За 1 день выпустить рабочий MVP.
- Обязательное условие: закрыть все `M + S + C` (`F01-F21`).
- Не реализуем только `W` (`F22-F35`).
- Режим реализации: normal version (без placeholder-подхода).

## CURRENT STATE (обновлять в первую очередь)
- Текущий этап: `E_STABILIZATION_COMPLETE`
- Текущая задача: `All planned items complete`
- Следующая задача: `Manual browser demo run with user`
- Последнее обновление: `2026-04-26 00:06`
- Выполнение по функциям: `MUST 6/6 | SHOULD 7/7 | COULD 8/8`

## EXECUTION RULES
- Таймбокс на одну задачу: 30-40 минут.
- Если задача не идет: упростить до lite, зафиксировать решение в `DECISIONS LOG`, идти дальше.
- Любой блокер сразу писать в `BLOCKERS LOG`.
- После завершения задачи менять статус на `DONE` в этом файле.
- Перед переходом на следующий этап пройти `Definition of done` текущего этапа.
- Любая функция `F01-F21` должна иметь итоговый статус: `DONE` или `DONE (lite)`.

## FIXED FUNCTION REGISTRY (из `docs/_do_not_touch_docs/DSDM_Dni1_2_RU.md`)
Важно: это фиксированный список функций из таблицы MoSCoW, чтобы ничего не забыть.

### MUST (1-6) — обязательно реализовать
- [x] DONE (lite) — F01 (M): Регистрация через университетскую электронную почту
- [x] DONE (lite) — F02 (M): Расписание занятий
- [x] DONE (lite) — F03 (M): Уведомления об изменениях в расписании (in-app, lite)
- [x] DONE (lite) — F04 (M): Электронная зачетная книжка (lite)
- [x] DONE (lite) — F05 (M): Оценки и академические результаты
- [x] DONE (lite) — F06 (M): Профиль студента

### SHOULD (7-13) — реализовать после MUST
- [x] DONE (lite) — F07 (S): Лента новостей университета
- [x] DONE (lite) — F08 (S): Каталог преподавателей и контакты
- [x] DONE (lite) — F09 (S): Столовая — меню на сегодня
- [x] DONE (lite) — F10 (S): Календарь студенческих мероприятий
- [x] DONE (lite) — F11 (S): Запрос официальных документов
- [x] DONE (lite) — F12 (S): Отслеживание статуса запроса документов
- [x] DONE (lite) — F13 (S): Push-уведомления об академической задолженности (lite)

### COULD (14-21) — только если останется время
- [x] DONE (lite) — F14 (C): Доска объявлений
- [x] DONE (lite) — F15 (C): Регистрация на мероприятия
- [x] DONE (lite) — F16 (C): Портфолио / достижения
- [x] DONE (lite) — F17 (C): Новости студенческого совета
- [x] DONE (lite) — F18 (C): Бюро находок
- [x] DONE (lite) — F19 (C): Расписание спортивных секций
- [x] DONE (lite) — F20 (C): Запись в спортивные секции
- [x] DONE (lite) — F21 (C): Темная тема (Dark mode)

### WON'T THIS RELEASE (22-35) — не реализуем в текущем цикле
- [ ] TODO — F22 (W): Карта кампуса с навигацией
- [ ] TODO — F23 (W): Запись на консультацию к преподавателю
- [ ] TODO — F24 (W): Столовая — предварительный заказ еды
- [ ] TODO — F25 (W): Бронирование аудиторий
- [ ] TODO — F26 (W): Библиотека — поиск и бронирование книг
- [ ] TODO — F27 (W): Чаты по группам
- [ ] TODO — F28 (W): Общий чат кампуса
- [ ] TODO — F29 (W): Поиск одногруппников
- [ ] TODO — F30 (W): Оплата общежития через веб-сайт
- [ ] TODO — F31 (W): Голосование за инициативы студсовета
- [ ] TODO — F32 (W): Анонимный чат психологической помощи
- [ ] TODO — F33 (W): Академический рейтинг студентов
- [ ] TODO — F34 (W): Интеграция с Telegram-ботом
- [ ] TODO — F35 (W): Мультиязычная поддержка

## DELIVERY ORDER (строгий порядок)
1. Закрыть все `MUST` (`F01-F06`).
2. Закрыть `SHOULD` в порядке `F07 -> F08 -> F09 -> F10 -> F11 -> F12 -> F13`.
3. Закрыть все `COULD` (`F14-F21`) в lite-формате по приоритету риска.
4. Только после `F01-F21` переходить к стабилизации и финальному demo-flow.

## A) FOUNDATION (0:00-1:00)
Цель: проект стартует и есть каркас.

- [x] DONE — A1: Create Next.js project (`TypeScript + Tailwind + App Router + src-dir`)
- [x] DONE — A2: Verify `npm run dev` (без падений)
- [x] DONE — A3: Create base folders (`app`, `components`, `lib`, `store`)
- [x] DONE — A4: Build base navigation (`auth` -> `dashboard`)
- [x] DONE — A5: Create mock data seed (`user`, `schedule`, `grades`, `news`, `documents`)

Definition of done for A:
- проект запускается;
- есть базовые переходы;
- можно начинать Must.

## B) MUST CORE (1:00-4:00)
Цель: закрыть обязательные user-flow.

- [x] DONE (lite) — B1 (F01): Registration/Login via university email (lite)
- [x] DONE (lite) — B2 (F01): Mock auth session (login/logout + session storage)
- [x] DONE (lite) — B3 (F01): Route protection and redirects
- [x] DONE (lite) — B4 (F06): Profile page
- [x] DONE (lite) — B5 (F02): Schedule page
- [x] DONE (lite) — B6 (F03): In-app notifications on schedule changes (lite)
- [x] DONE (lite) — B7 (F05): Grades and academic results page
- [x] DONE (lite) — B8 (F04): Gradebook page (lite)
- [x] DONE (lite) — B9: Must smoke test (`Login -> Profile -> Schedule -> Grades -> Gradebook -> Logout`)

Definition of done for B:
- полный Must-сценарий проходит end-to-end;
- нет P1-блокеров в UI/консоли.
- `F01-F06` отмечены как `DONE` или `DONE (lite)`.

## C) SHOULD VALUE (4:00-7:00)
Цель: добавить полезную ценность без риска ядру.

- [x] DONE (lite) — C1 (F07): News page (list)
- [x] DONE (lite) — C2 (F08): Teachers catalog page (static allowed)
- [x] DONE (lite) — C3 (F09): Canteen menu page (today menu)
- [x] DONE (lite) — C4 (F10): Student events calendar (lite)
- [x] DONE (lite) — C5 (F11+F12): Documents request page (form + statuses)
- [x] DONE (lite) — C6 (F13): Academic debt notifications (lite/in-app)
- [x] DONE (lite) — C7: Smoke test (`Must + Should`)

Definition of done for C:
- Should работает в lite-формате;
- Must остается стабильным.
- минимум `F07-F13` в статусе `DONE (lite)` или обоснованно перенесены в `DECISIONS LOG`.

## D) COULD ENHANCEMENTS (7:00-9:00)
Цель: полностью закрыть `F14-F21` в безопасном lite-режиме.

- [x] DONE (lite) — D1 (F21): Dark mode
- [x] DONE (lite) — D2 (F14): Доска объявлений
- [x] DONE (lite) — D3 (F15): Регистрация на мероприятия
- [x] DONE (lite) — D4 (F16): Портфолио / достижения
- [x] DONE (lite) — D5 (F17): Новости студсовета
- [x] DONE (lite) — D6 (F18): Бюро находок
- [x] DONE (lite) — D7 (F19): Расписание спортивных секций
- [x] DONE (lite) — D8 (F20): Запись в спортивные секции
- [x] DONE (lite) — D9: Re-smoke key flows after Could block

Definition of done for D:
- `F14-F21` имеют статус `DONE` или `DONE (lite)`;
- улучшения не ломают критичный flow.

## E) STABILIZATION & DEMO (9:00-10:00)
Цель: зафиксировать стабильную версию для показа.

- [x] DONE — E1: Feature freeze (new features stop)
- [x] DONE — E2: Fix all P1/P2
- [x] DONE — E3: Run `npm run build`
- [x] DONE — E4: Prepare demo flow (40-60 sec)
- [x] DONE (lite) — E5: Final demo smoke test

### W-функции (F22-F35) фиксация статуса
- [x] DONE — E6: Зафиксировать в Decisions Log, что F22-F35 = Won't this release

Definition of done for E:
- dev и build стабильны;
- demo-flow проходит без критических ошибок.
- итоговая проверка: `F01-F21` закрыты, `F22-F35` не реализуются по плану.

## IMPLEMENTATION NOTES (как помечать статус)
- `DONE` — реализовано полностью в рамках MVP.
- `DONE (lite)` — реализовано упрощенно, но рабочий путь есть.
- `BLOCKED` — есть внешний или технический блокер.
- `SKIPPED (by priority)` — сознательно пропущено в текущем цикле.

## DEMO FLOW (обязательный проход перед финишем)
1. Login / Registration via university email (`F01`).
2. Profile (`F06`).
3. Schedule + in-app schedule update notice (`F02`, `F03`).
4. Grades + Gradebook (`F05`, `F04`).
5. News and Documents status (`F07`, `F11`, `F12`).
6. Logout.

Критерий: весь flow проходит без 404 и без блокирующих ошибок.

## BUGS LOG
### P1 (Blocking)
- (empty)
### P2 (Major)
- (empty)
### P3 (Minor)
- (empty)

## BLOCKERS LOG
- (empty)

## DECISIONS LOG
- 2026-04-26: F22-F35 зафиксированы как Won't this release.
