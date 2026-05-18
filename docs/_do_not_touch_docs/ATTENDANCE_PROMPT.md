# Дополнение к Campus Student Portal — Посещаемость и доступ учителей

> Это дополнение к основному промту. Прочитай его полностью и внедри поверх того что уже сделано.

---

## 1. СТРОГИЙ ДОСТУП УЧИТЕЛЯ

Учитель видит **только то, к чему он прикреплён**. Это не пожелание — это жёсткое правило на уровне каждого API запроса.

**Правило по классам:**
Учитель имеет доступ к классу только если существует запись `ClassTeacher` где `teacherId = текущий учитель` И `classId = запрошенный класс`. Любой запрос к чужому классу → `403 Forbidden`.

**Правило по предметам:**
Учитель имеет доступ к предмету только если существует запись `TeacherSubject` где `teacherId = текущий учитель` AND `subjectId = запрошенный предмет`. Запрос оценок, посещаемости или расписания по чужому предмету → `403 Forbidden`.

**Правило по студентам:**
Учитель видит студента только если тот состоит в классе, к которому учитель прикреплён.

**Реализация — хелпер функция** `src/lib/teacher-access.ts`:

```typescript
import { prisma } from './prisma'

// Проверить что учитель имеет доступ к классу
export async function assertTeacherClassAccess(teacherId: string, classId: string) {
  const link = await prisma.classTeacher.findUnique({
    where: { classId_teacherId: { classId, teacherId } }
  })
  if (!link) throw new ForbiddenError('No access to this class')
}

// Проверить что учитель имеет доступ к предмету
export async function assertTeacherSubjectAccess(teacherId: string, subjectId: string) {
  const link = await prisma.teacherSubject.findUnique({
    where: { teacherId_subjectId: { teacherId, subjectId } }
  })
  if (!link) throw new ForbiddenError('No access to this subject')
}

// Получить только доступные учителю классы
export async function getTeacherClasses(teacherId: string) {
  return prisma.class.findMany({
    where: { teachers: { some: { teacherId } } },
    include: { students: { include: { user: true } }, subjects: { include: { subject: true } } }
  })
}

// Получить только доступные учителю предметы
export async function getTeacherSubjects(teacherId: string) {
  return prisma.subject.findMany({
    where: { teachers: { some: { teacherId } } }
  })
}
```

Этот хелпер вызывается в **каждом** teacher API route перед любой операцией с данными.

---

## 2. МОДЕЛЬ ПОСЕЩАЕМОСТИ В БД

Добавь в `prisma/schema.prisma`:

```prisma
model Attendance {
  id             String           @id @default(cuid())
  studentId      String
  student        Student          @relation(fields: [studentId], references: [id])
  scheduleItemId String
  scheduleItem   ScheduleItem     @relation(fields: [scheduleItemId], references: [id])
  teacherId      String
  teacher        Teacher          @relation(fields: [teacherId], references: [id])
  classId        String
  class          Class            @relation(fields: [classId], references: [id])
  subjectId      String
  subject        Subject          @relation(fields: [subjectId], references: [id])
  date           DateTime         @db.Date
  status         AttendanceStatus
  note           String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@unique([studentId, scheduleItemId, date])
  @@index([date])
  @@index([classId, date])
  @@index([teacherId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}
```

Добавь relations в существующие модели:

```prisma
// Student
attendances Attendance[]

// Teacher  
attendances Attendance[]

// ScheduleItem
attendances Attendance[]

// Class
attendances Attendance[]

// Subject
attendances Attendance[]
```

---

## 3. API МАРШРУТЫ — ПОСЕЩАЕМОСТЬ

```
GET    /api/teacher/attendance?date=2024-01-15
       → возвращает все пары учителя в этот день (из ScheduleItem по dayOfWeek)
         с количеством студентов и статусом заполненности (filled/not filled)

GET    /api/teacher/attendance/session?scheduleItemId=xxx&date=2024-01-15
       → список всех студентов класса этой пары
         для каждого студента: { studentId, name, status, note } или null если не заполнено

POST   /api/teacher/attendance/session
       body: { scheduleItemId, date, records: [{ studentId, status, note? }] }
       → создаёт или обновляет записи посещаемости (upsert)
       → проверяет через assertTeacherClassAccess и assertTeacherSubjectAccess

PATCH  /api/teacher/attendance/[id]
       body: { status, note? }
       → редактирование одной записи

GET    /api/student/attendance
       → посещаемость текущего студента сгруппированная по предметам:
         { subjectId, subjectName, total, present, absent, late, attendanceRate }

GET    /api/admin/attendance?classId=&subjectId=&date=&studentId=
       → посещаемость с фильтрами, только для ADMIN
```

---

## 4. СТРАНИЦА ПОСЕЩАЕМОСТИ ДЛЯ УЧИТЕЛЯ

**Маршрут:** `/dashboard/teacher/attendance`

**Интерфейс — два блока рядом:**

```
┌─────────────────────────┬──────────────────────────────────────────┐
│  КАЛЕНДАРЬ              │  ПАРЫ НА ВЫБРАННЫЙ ДЕНЬ                  │
│                         │                                          │
│  < Январь 2024 >        │  Понедельник, 15 января 2024             │
│                         │                                          │
│  Пн Вт Ср Чт Пт Сб Вс  │  ┌──────────────────────────────────┐   │
│   1  2  3  4  5  6  7   │  │ 🟢 09:00–10:30                   │   │
│   8  9 10 11 12 13 14   │  │ Discrete Math — CS-101 — Room 204│   │
│  [15]16 17 18 19 20 21  │  │ ✅ Заполнено (24/24)              │   │
│  22 23 24 25 26 27 28   │  │                      [Открыть →] │   │
│  29 30 31               │  └──────────────────────────────────┘   │
│                         │                                          │
│  Легенда:               │  ┌──────────────────────────────────┐   │
│  🟢 все заполнены       │  │ 🔴 11:00–12:30                   │   │
│  🟡 частично            │  │ Web Development — CS-201 — Room 101│  │
│  🔴 не заполнено        │  │ ⚠️ Не заполнено                  │   │
│  ⚪ нет пар             │  │                      [Заполнить →]│   │
│                         │  └──────────────────────────────────┘   │
└─────────────────────────┴──────────────────────────────────────────┘
```

**Правила календаря:**
- Текущий день подсвечен indigo-600
- Дни с парами имеют цветную точку внизу: зелёная (всё заполнено) / красная (есть незаполненные) / серая (нет пар)
- Выходные (Сб, Вс) — серые, не кликабельные
- Прошедшие дни доступны для редактирования (можно исправить ошибки)
- Будущие дни — можно открыть но нельзя сохранить (disabled)

**Когда нажать "Заполнить" / "Открыть" — открывается страница сессии:**

**Маршрут:** `/dashboard/teacher/attendance/[scheduleItemId]?date=2024-01-15`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Назад к расписанию                                           │
│                                                                 │
│  Web Development  •  CS-201  •  Room 101                        │
│  Понедельник, 15 января 2024  •  11:00 – 12:30                  │
│                                                                 │
│  Быстрые действия: [Все PRESENT] [Все ABSENT]                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  #   Студент              PRESENT  ABSENT  LATE  Заметка│    │
│  ├────────────────────────────────────────────────────────┤    │
│  │  1   Ali Valiyev          ( • )    (   )   (   )  [___]│    │
│  │  2   Malika Yusupova      (   )    ( • )   (   )  [опоздала на 20 мин]│
│  │  3   Jasur Karimov        (   )    (   )   ( • )  [___]│    │
│  │  ...                                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Итого: 18 present  •  3 absent  •  3 late  •  24 студентов    │
│                                                                 │
│                                        [Отмена]  [Сохранить ✓] │
└─────────────────────────────────────────────────────────────────┘
```

**UX правила сессии:**
- Каждая строка: radio-group из трёх кнопок `PRESENT / ABSENT / LATE` (не checkbox, а radio — выбрать можно только одно)
- По умолчанию ничего не выбрано (новая сессия) или загружены существующие данные
- Поле заметки — короткий text input, появляется/активируется при выборе ABSENT или LATE
- Кнопка «Все PRESENT» — мгновенно ставит всем PRESENT
- Счётчик внизу обновляется в реальном времени при изменениях
- Сохранение — один POST/upsert запрос со всеми записями сразу
- После сохранения — toast «Посещаемость сохранена» и возврат к календарю

---

## 5. ПОСЕЩАЕМОСТЬ НА СТРАНИЦЕ СТУДЕНТА

**Добавить на `/dashboard/student/grades` или отдельная вкладка `/dashboard/student/attendance`:**

```
┌─────────────────────────────────────────────┐
│  Посещаемость по предметам                  │
├──────────────────┬───────┬───────┬──────────┤
│ Предмет          │ Всего │ Прис. │ Пропуск. │ Опозд. │ %    │
├──────────────────┼───────┼───────┼──────────┼────────┼──────┤
│ Discrete Math    │  24   │  22   │    1     │   1    │ 91%  │ 🟢
│ Web Development  │  20   │  18   │    2     │   0    │ 90%  │ 🟢
│ Physics          │  18   │  12   │    4     │   2    │ 66%  │ 🔴 ⚠️
└──────────────────┴───────┴───────┴──────────┴────────┴──────┘

⚠️ По предмету Physics посещаемость ниже 75% — риск отчисления с экзамена
```

- Процент ≥ 85% → зелёный
- 75–84% → жёлтый
- < 75% → красный + предупреждение

---

## 6. ПОСЕЩАЕМОСТЬ ДЛЯ АДМИНИСТРАТОРА

**Добавить раздел `/dashboard/admin/attendance`:**

- Фильтры: Класс | Предмет | Дата от–до | Студент
- Сводная таблица: Студент | Предмет | Всего занятий | Present | Absent | Late | %
- Клик на студента → его полная история посещаемости
- Экспорт (кнопка, UI only)

---

## 7. SEED ДАННЫЕ ДЛЯ ПОСЕЩАЕМОСТИ

В `prisma/seed.ts` добавить посещаемость за последние 2 недели:

```typescript
// Для каждого scheduleItem за последние 10 рабочих дней
// генерировать записи для всех студентов класса:
// - 80% PRESENT
// - 12% ABSENT  
// - 8% LATE
// Для одного студента намеренно сделать плохую посещаемость (< 75%)
// чтобы триггернуть предупреждение в интерфейсе
```

---

## 8. ОБНОВИТЬ САЙДБАР УЧИТЕЛЯ

Добавить в sidebar для роли TEACHER:

```
─── АКАДЕМИЧЕСКОЕ ──────────────
📊 Dashboard
📅 Расписание
👥 Мои классы
📝 Оценки

─── ПОСЕЩАЕМОСТЬ ───────────────    ← НОВАЯ СЕКЦИЯ
📋 Отметить посещаемость            ← /dashboard/teacher/attendance

─── КАМПУС ─────────────────────
📰 Новости
🍽 Столовая

─── АККАУНТ ─────────────────────
👤 Профиль
🔐 Сменить пароль
🚪 Выйти
```

---

## 9. КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

- Учитель **физически не может** получить данные чужого класса или предмета — проверка через хелпер на каждом API route
- На странице заполнения посещаемости показываются **только студенты именно этого класса** (не все студенты)
- `scheduleItem` привязан к конкретному `teacherId` — учитель видит только свои пары
- Upsert логика: повторное сохранение посещаемости обновляет существующие записи, не дублирует
- Дата в `Attendance` хранится как `@db.Date` (без времени) — уникальность по `[studentId, scheduleItemId, date]`
- Логика определения дня недели: берём выбранную дату → определяем `DayOfWeek` → ищем `ScheduleItem` по `teacherId + dayOfWeek`
