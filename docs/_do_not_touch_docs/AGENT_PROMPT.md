## ЗАДАЧА

Ты строишь полноценный университетский кампус-портал — **Campus Student Portal** — на Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM + PostgreSQL. Это реальный продукт, не учебное задание. Он должен выглядеть как Vercel dashboard или Linear — с живыми данными, правильной архитектурой и нормальным UX. Никаких заглушек, никаких пустых страниц, никаких white cards с border-slate-200 и тремя bullet-points внутри.

---

## РОЛИ И ДОСТУП

Пять ролей. Middleware проверяет роль на каждом защищённом маршруте. Неправильная роль → redirect.

| Роль | Описание |
|------|----------|
| `ADMIN` | Полный доступ ко всему. Управляет пользователями, классами, расписанием, запросами документов. |
| `TEACHER` | Видит свои классы и студентов. Выставляет оценки. Публикует объявления для своих классов. |
| `STUDENT` | Видит только свои данные. Просматривает расписание, оценки, новости. Подаёт запросы документов, регистрируется на события. |
| `CANTEEN_STAFF` | Управляет меню столовой. Нет доступа к академическим данным. |
| `PARENT` | Только чтение: оценки и расписание своего ребёнка. |

---

## БАЗА ДАННЫХ — ПОЛНАЯ PRISMA СХЕМА

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String         @id @default(cuid())
  email          String         @unique
  passwordHash   String
  role           Role           @default(STUDENT)
  firstName      String
  lastName       String
  phone          String?
  avatarUrl      String?
  mustChangePass Boolean        @default(false)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  student        Student?
  teacher        Teacher?
  parent         Parent?
  notifications  Notification[]
  announcements  Announcement[]
  lostFoundItems LostFoundItem[]
  bulletinPosts  BulletinPost[]
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  CANTEEN_STAFF
  PARENT
}

model Student {
  id                 String               @id @default(cuid())
  userId             String               @unique
  user               User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  studentCode        String               @unique
  classId            String?
  class              Class?               @relation(fields: [classId], references: [id])
  year               Int
  enrolledAt         DateTime             @default(now())
  grades             Grade[]
  documentRequests   DocumentRequest[]
  eventRegistrations EventRegistration[]
  sportsRegistrations SportsRegistration[]
  parents            Parent[]
}

model Teacher {
  id            String           @id @default(cuid())
  userId        String           @unique
  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  employeeId    String           @unique
  department    String
  bio           String?
  subjects      TeacherSubject[]
  classes       ClassTeacher[]
  grades        Grade[]
  announcements Announcement[]
}

model Parent {
  id       String    @id @default(cuid())
  userId   String    @unique
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  children Student[]
}

model Class {
  id            String         @id @default(cuid())
  name          String
  year          Int
  students      Student[]
  teachers      ClassTeacher[]
  subjects      ClassSubject[]
  scheduleItems ScheduleItem[]
  announcements Announcement[]
}

model Subject {
  id       String           @id @default(cuid())
  name     String
  code     String           @unique
  credits  Int              @default(3)
  teachers TeacherSubject[]
  classes  ClassSubject[]
  grades   Grade[]
  schedule ScheduleItem[]
}

model TeacherSubject {
  teacherId String
  subjectId String
  teacher   Teacher @relation(fields: [teacherId], references: [id])
  subject   Subject @relation(fields: [subjectId], references: [id])
  @@id([teacherId, subjectId])
}

model ClassTeacher {
  classId    String
  teacherId  String
  isHomeroom Boolean @default(false)
  class      Class   @relation(fields: [classId], references: [id])
  teacher    Teacher @relation(fields: [teacherId], references: [id])
  @@id([classId, teacherId])
}

model ClassSubject {
  classId   String
  subjectId String
  class     Class   @relation(fields: [classId], references: [id])
  subject   Subject @relation(fields: [subjectId], references: [id])
  @@id([classId, subjectId])
}

model ScheduleItem {
  id         String    @id @default(cuid())
  classId    String
  subjectId  String
  teacherId  String
  dayOfWeek  DayOfWeek
  startTime  String
  endTime    String
  room       String
  changeNote String?
  updatedAt  DateTime  @updatedAt
  class      Class     @relation(fields: [classId], references: [id])
  subject    Subject   @relation(fields: [subjectId], references: [id])
}

enum DayOfWeek {
  MON TUE WED THU FRI
}

model Grade {
  id        String    @id @default(cuid())
  studentId String
  subjectId String
  teacherId String
  score     Int
  type      GradeType
  comment   String?
  gradedAt  DateTime  @default(now())
  student   Student   @relation(fields: [studentId], references: [id])
  subject   Subject   @relation(fields: [subjectId], references: [id])
  teacher   Teacher   @relation(fields: [teacherId], references: [id])
}

enum GradeType {
  QUIZ
  MIDTERM
  FINAL
  ASSIGNMENT
  ATTENDANCE
}

model Announcement {
  id          String    @id @default(cuid())
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  teacherId   String?
  teacher     Teacher?  @relation(fields: [teacherId], references: [id])
  classId     String?
  class       Class?    @relation(fields: [classId], references: [id])
  targetRole  Role?
  title       String
  content     String
  isPinned    Boolean   @default(false)
  publishedAt DateTime  @default(now())
  expiresAt   DateTime?
}

model Event {
  id              String              @id @default(cuid())
  title           String
  description     String
  location        String
  startDate       DateTime
  endDate         DateTime
  maxParticipants Int?
  registrations   EventRegistration[]
}

model EventRegistration {
  id           String   @id @default(cuid())
  eventId      String
  studentId    String
  registeredAt DateTime @default(now())
  event        Event    @relation(fields: [eventId], references: [id])
  student      Student  @relation(fields: [studentId], references: [id])
  @@unique([eventId, studentId])
}

model CanteenMenu {
  id    String        @id @default(cuid())
  date  DateTime      @unique @db.Date
  items CanteenItem[]
}

model CanteenItem {
  id          String       @id @default(cuid())
  menuId      String
  menu        CanteenMenu  @relation(fields: [menuId], references: [id])
  name        String
  description String?
  price       Float
  category    MealCategory
  available   Boolean      @default(true)
  calories    Int?
}

enum MealCategory {
  BREAKFAST
  LUNCH
  SNACK
  DRINKS
}

model DocumentRequest {
  id          String        @id @default(cuid())
  studentId   String
  student     Student       @relation(fields: [studentId], references: [id])
  type        DocumentType
  description String?
  status      RequestStatus @default(PENDING)
  adminNote   String?
  requestedAt DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum DocumentType {
  ENROLLMENT_CERT
  TRANSCRIPT
  DORMITORY_CERT
  SCHOLARSHIP_CERT
  OTHER
}

enum RequestStatus {
  PENDING
  IN_PROGRESS
  DONE
  REJECTED
}

model BulletinPost {
  id          String   @id @default(cuid())
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  title       String
  description String
  category    String
  price       Float?
  contactInfo String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model LostFoundItem {
  id          String          @id @default(cuid())
  reportedBy  String
  reporter    User            @relation(fields: [reportedBy], references: [id])
  title       String
  description String
  location    String
  status      LostFoundStatus @default(LOST)
  foundDate   DateTime?
  createdAt   DateTime        @default(now())
}

enum LostFoundStatus {
  LOST
  FOUND
  CLAIMED
}

model SportsSection {
  id            String               @id @default(cuid())
  name          String
  coach         String
  description   String?
  schedule      String
  location      String
  maxMembers    Int?
  registrations SportsRegistration[]
}

model SportsRegistration {
  id           String        @id @default(cuid())
  sectionId    String
  studentId    String
  section      SportsSection @relation(fields: [sectionId], references: [id])
  student      Student       @relation(fields: [studentId], references: [id])
  registeredAt DateTime      @default(now())
  @@unique([sectionId, studentId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String
  message   String
  read      Boolean  @default(false)
  link      String?
  createdAt DateTime @default(now())
}

model CouncilNews {
  id          String   @id @default(cuid())
  title       String
  content     String
  authorName  String
  category    String
  publishedAt DateTime @default(now())
}

model Portfolio {
  id           String                 @id @default(cuid())
  studentId    String                 @unique
  bio          String?
  achievements PortfolioAchievement[]
}

model PortfolioAchievement {
  id          String    @id @default(cuid())
  portfolioId String
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id])
  title       String
  description String
  date        DateTime
  category    String
}

model AcademicRanking {
  id        String   @id @default(cuid())
  studentId String   @unique
  gpa       Float
  rank      Int
  semester  String
  updatedAt DateTime @updatedAt
}
```

---

## SEED ДАННЫЕ (`prisma/seed.ts`)

Создай реалистичные данные:

- **1 admin:** `admin@university.edu` / `Admin123!`
- **3 teacher:** `math.teacher@university.edu`, `cs.teacher@university.edu`, `physics.teacher@university.edu` / `Teacher123!`
- **1 canteen_staff:** `canteen@university.edu` / `Canteen123!`
- **1 parent:** `parent@university.edu` / `Parent123!`
- **2 класса:** `CS-101` (1 курс, 6 студентов), `CS-201` (2 курс, 6 студентов)
- **Предметы:** Discrete Math, Web Development, Database Systems, Algorithms, Physics
- **Полное расписание** для каждого класса (Mon–Fri, 3 пары в день)
- **Оценки** для всех студентов по всем предметам — разные типы (QUIZ, MIDTERM, FINAL), разные баллы (часть < 65 — в зоне риска)
- **3 объявления** (1 pinned, 2 обычных)
- **2 события** с разными датами и несколькими регистрациями
- **Меню столовой** на сегодня и завтра (BREAKFAST, LUNCH, SNACK, DRINKS с ценами и калориями)
- **3 запроса документов** в статусах PENDING, IN_PROGRESS, DONE
- **5 lost & found** предметов
- **2 спортивные секции**
- **Новости студсовета** — 3 поста
- **AcademicRanking** для всех студентов (считается как средний балл)
- **Уведомления** для каждого пользователя (3-5 штук)
- **Portfolio** с достижениями для студентов CS-101
- Родитель привязан к первому студенту CS-101

---

## АУТЕНТИФИКАЦИЯ

- `bcryptjs` — хэш пароля, 12 rounds
- `jose` — JWT (HS256), httpOnly + secure + sameSite=lax cookie, 7 дней
- `src/middleware.ts` — защита всех `/dashboard/*` маршрутов через JWT из cookie
- Редиректы по роли:
  - ADMIN → `/dashboard/admin`
  - TEACHER → `/dashboard/teacher`
  - STUDENT → `/dashboard/student`
  - CANTEEN_STAFF → `/dashboard/canteen`
  - PARENT → `/dashboard/parent`
- **Смена пароля** — для всех ролей:
  - Проверяет текущий пароль перед заменой
  - Минимум 8 символов + хотя бы одна цифра
- **Сброс пароля** — только ADMIN: устанавливает временный пароль, флаг `mustChangePass = true`
- При `mustChangePass = true` → middleware редиректит на `/dashboard/change-password`

---

## API МАРШРУТЫ

Все под `src/app/api/`. Каждый маршрут обязан:

1. Извлечь JWT из cookie → `userId` + `role`
2. Проверить авторизацию роли → `403` если нет доступа
3. Валидировать тело через `zod`
4. Использовать Prisma для всех операций с БД
5. Возвращать `{ data: ... }` или `{ error: "..." }` с правильным HTTP кодом

```
AUTH
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/change-password

ADMIN
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/[id]
DELETE /api/admin/users/[id]
POST   /api/admin/users/[id]/reset-password
GET    /api/admin/classes
POST   /api/admin/classes
PATCH  /api/admin/classes/[id]
DELETE /api/admin/classes/[id]
POST   /api/admin/classes/[id]/students       → assign student
DELETE /api/admin/classes/[id]/students/[sid] → remove student
POST   /api/admin/classes/[id]/teachers       → assign teacher
GET    /api/admin/document-requests
PATCH  /api/admin/document-requests/[id]      → update status + note
POST   /api/admin/rankings/refresh            → пересчёт рейтингов

TEACHER
GET    /api/teacher/my-classes
GET    /api/teacher/my-classes/[id]/students
GET    /api/grades?classId=&subjectId=
POST   /api/grades
PATCH  /api/grades/[id]
DELETE /api/grades/[id]

STUDENT
GET    /api/student/grades
GET    /api/student/schedule
GET    /api/student/profile
PATCH  /api/student/profile
GET    /api/student/document-requests
POST   /api/student/document-requests
POST   /api/student/events/[id]/register
DELETE /api/student/events/[id]/register
POST   /api/student/sports/[id]/register
DELETE /api/student/sports/[id]/register

SHARED (все роли)
GET    /api/announcements
POST   /api/announcements        → ADMIN + TEACHER
GET    /api/events
GET    /api/canteen/menu?date=
POST   /api/canteen/menu         → CANTEEN_STAFF + ADMIN
PATCH  /api/canteen/menu/[id]/items/[itemId]
POST   /api/canteen/menu/[id]/items
DELETE /api/canteen/menu/[id]/items/[itemId]
GET    /api/teachers
GET    /api/notifications
PATCH  /api/notifications/[id]/read
PATCH  /api/notifications/read-all
GET    /api/lost-found
POST   /api/lost-found
PATCH  /api/lost-found/[id]
GET    /api/bulletin
POST   /api/bulletin
GET    /api/sports
GET    /api/rankings
GET    /api/council-news
```

---

## АРХИТЕКТУРА UI

### Структура layout

```
src/app/
├── page.tsx                          ← лендинг / redirect
├── auth/
│   └── login/page.tsx
├── dashboard/
│   ├── layout.tsx                    ← общий shell: sidebar + topbar
│   ├── change-password/page.tsx
│   │
│   ├── admin/
│   │   ├── page.tsx                  ← admin dashboard
│   │   ├── users/page.tsx
│   │   ├── classes/page.tsx
│   │   ├── classes/[id]/page.tsx
│   │   ├── document-requests/page.tsx
│   │   ├── schedule/page.tsx
│   │   └── announcements/page.tsx
│   │
│   ├── teacher/
│   │   ├── page.tsx
│   │   ├── my-classes/page.tsx
│   │   ├── my-classes/[id]/page.tsx
│   │   ├── grades/page.tsx
│   │   └── announcements/page.tsx
│   │
│   ├── student/
│   │   ├── page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── grades/page.tsx
│   │   ├── gradebook/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── events/page.tsx
│   │   ├── canteen/page.tsx
│   │   ├── news/page.tsx
│   │   ├── announcements/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── teachers/page.tsx
│   │   ├── bulletin/page.tsx
│   │   ├── lost-found/page.tsx
│   │   ├── sports/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── council-news/page.tsx
│   │   ├── rankings/page.tsx
│   │   └── profile/page.tsx
│   │
│   ├── canteen/
│   │   ├── page.tsx
│   │   └── menu/page.tsx
│   │
│   └── parent/
│       ├── page.tsx
│       ├── grades/page.tsx
│       └── schedule/page.tsx
│
└── api/...
```

### Sidebar — строгие правила

**НИКАКИХ pill-badge chips, flex-wrap, rounded-full меток.** Sidebar — это вертикальный список. Каждый пункт:

```
[Icon 20px] Label                [badge?]
```

- Активный пункт: `bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600`
- Неактивный: `text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors`
- Каждый item: `flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm`
- Заголовок секции: `text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mt-5 mb-1`
- Разделитель между секциями: `border-t border-slate-100 my-2`

Каждая роль видит только свои секции. Пример для STUDENT:

```
─── АКАДЕМИЧЕСКОЕ ──────────────
📊 Dashboard
📅 Расписание
📝 Оценки
📚 Зачётная книжка

─── КАМПУС ─────────────────────
📰 Новости
🗓 Мероприятия
🍽 Столовая
👨‍🏫 Преподаватели

─── СЕРВИСЫ ─────────────────────
📄 Документы
🔔 Уведомления     [3]
📌 Доска объявлений
🔍 Бюро находок
⚽ Спорт
🏆 Достижения
📢 Совет студентов
🥇 Рейтинг

─── АККАУНТ ─────────────────────
👤 Профиль
🔐 Сменить пароль
🚪 Выйти
```

### Design System

```css
/* Цвета */
--primary: indigo-600         /* кнопки, активные элементы */
--primary-light: indigo-50    /* фон активного sidebar item */
--success: emerald-600
--warning: amber-600
--danger: rose-600

/* Карточки */
.card {
  bg-white rounded-xl shadow-sm border border-slate-100 p-5
  hover:shadow-md transition-shadow duration-200
}

/* Stat card */
.stat-card {
  bg-white rounded-xl p-5 border-l-4 shadow-sm
  /* Внутри: icon top-right 40x40 colored bg rounded-lg */
  /* Число: text-3xl font-bold text-slate-900 */
  /* Метка: text-sm text-slate-500 mt-1 */
}

/* Таблицы */
thead {
  bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500
  border-b border-slate-200
}
tbody tr {
  border-b border-slate-100 hover:bg-slate-50 transition-colors
}

/* Кнопки */
.btn-primary   { bg-indigo-600 text-white hover:bg-indigo-700 }
.btn-secondary { border border-slate-300 text-slate-700 hover:bg-slate-50 }
.btn-danger    { bg-rose-600 text-white hover:bg-rose-700 }
/* Все: px-4 py-2 rounded-lg text-sm font-medium transition-colors */
/* Loading state: disabled:opacity-60 + spinner */

/* Inputs */
input, select, textarea {
  border border-slate-300 rounded-lg px-3 py-2 text-sm w-full
  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
}
/* Error: border-rose-400 + текст ошибки ниже rose-600 text-xs */

/* Badges */
.badge-pending     { bg-amber-100 text-amber-700 }
.badge-in_progress { bg-blue-100 text-blue-700 }
.badge-done        { bg-emerald-100 text-emerald-700 }
.badge-rejected    { bg-rose-100 text-rose-700 }
/* Все: px-2.5 py-0.5 rounded-full text-xs font-medium */

/* Grade bars */
score >= 80  → bg-emerald-500
score 65–79  → bg-amber-500
score < 65   → bg-rose-500

/* Empty states */
/* Центровано: emoji/иконка 48px + h3 + p + button */
/* Никогда не оставлять просто белое пространство */
```

---

## СТРАНИЦЫ — ЧТО СТРОИТЬ

### STUDENT — `/dashboard/student`
- Приветствие: `Good morning, Ali 👋` + текущая дата
- Stat row (4 карточки с border-l-4): Пар сегодня | Средний балл | Активных запросов | Непрочитанных уведомлений
- **Расписание на сегодня** — список пар с временем, кабинетом, преподавателем. Если пар нет — empty state.
- **Академическое состояние** — мини-grade bars по каждому предмету, выделен средний балл, предметы риска (<65) — с красным индикатором и предупреждением
- **Последние объявления** — 3 штуки, pinned сверху с 📌
- **Ближайшие события** — 2 карточки с кнопкой Зарегистрироваться
- **Быстрые действия** — 4 иконки-кнопки: Подать документ / Расписание / Столовая / Уведомления

### `/dashboard/student/schedule`
- Недельная таблица-сетка: колонки = Mon–Fri, строки = временные слоты
- Каждая ячейка: название предмета, кабинет, имя преподавателя (small)
- Изменённые ячейки — amber badge с текстом изменения
- Пустые ячейки — dashed border, bg-slate-50

### `/dashboard/student/grades`
- Вверху: **GPA = X.X** большим шрифтом + текущий семестр
- Если есть предметы с баллом < 65 — красный banner предупреждения
- По каждому предмету: название, кредиты, score bar (цветной), все оценки внутри (тип, балл, дата, комментарий преподавателя)
- Фильтр по семестру

### `/dashboard/student/gradebook`
- Полная история оценок — таблица: Предмет | Тип | Балл | Дата | Преподаватель | Комментарий
- Фильтр по предмету и типу

### `/dashboard/student/documents`
- Форма: dropdown типа + textarea описания + кнопка Submit
- Список запросов с **таймлайном статуса**: `PENDING → IN_PROGRESS → DONE` как шаги с иконками
- Административные заметки показаны когда есть

### `/dashboard/student/events`
- Карточки событий: название, дата, место, количество мест
- Кнопка Register/Unregister (optimistic update)
- Прошедшие события — затемнены, регистрация недоступна

### `/dashboard/student/canteen`
- Сегодняшняя дата крупно
- Таб-навигация: ЗАВТРАК | ОБЕД | ПЕРЕКУС | НАПИТКИ
- Каждый пункт: название, описание, цена (жирно), калории (мелко), бейдж наличия

### `/dashboard/student/announcements`
- Pinned объявления вверху с 📌
- Каждая карточка: заголовок, превью, автор (имя + роль), дата, бейдж аудитории
- Клик — разворачивает полный текст (accordion)

### `/dashboard/student/notifications`
- Список: иконка (цвет по типу) + заголовок + сообщение + время
- Клик — помечает прочитанным (текст светлеет)
- Кнопка «Отметить все как прочитанные»
- Empty state с иконкой 🔔

### `/dashboard/student/teachers`
- Сетка карточек: аватар (инициалы), имя, кафедра, преподаваемые предметы, email-ссылка
- Поиск по имени / кафедре

### `/dashboard/student/sports`
- Карточки секций: название, тренер, расписание, место, количество мест
- Кнопка Register/Unregister для каждой

### `/dashboard/student/rankings`
- Топ-10 таблица: место (с медалью 🥇🥈🥉 для топ-3) | имя | класс | GPA
- Текущий студент подсвечен

### `/dashboard/student/profile`
- Форма редактирования: имя, фамилия, телефон
- Аватар на основе инициалов (цветной круг)
- Информация (read-only): код студента, класс, год, факультет
- Секция смены пароля: текущий → новый → подтверждение

### ADMIN — `/dashboard/admin`
- Stat row: Всего студентов | Преподавателей | Классов | Ожидающих запросов
- Таблица последних запросов документов
- Последние зарегистрированные пользователи
- Быстрые действия: Создать пользователя | Создать класс | Обновить рейтинги

### `/dashboard/admin/users`
- Таблица: Имя | Email | Роль | Дата создания | Действия
- Поиск + фильтр по роли
- Кнопки на строке: Редактировать | Сбросить пароль | Удалить
- Модальное окно создания/редактирования пользователя (все поля + роль)
- Подтверждение перед удалением

### `/dashboard/admin/classes`
- Таблица классов: Название | Год | Классный руководитель | Количество студентов
- Создать / редактировать / удалить класс
- Страница класса `/admin/classes/[id]`:
  - Список студентов с кнопкой Remove
  - Поиск и добавление студента в класс
  - Список преподавателей, назначенных на класс
  - Расписание класса

### `/dashboard/admin/document-requests`
- Таблица всех запросов: Студент | Тип | Статус | Дата | Действия
- Клик на строку → модальное окно: изменить статус + добавить заметку администратора

### TEACHER — `/dashboard/teacher`
- Сегодняшние занятия
- Последние выставленные оценки
- Объявления их классов

### `/dashboard/teacher/my-classes/[id]`
- Список студентов класса
- Inline ввод оценок: таблица студентов → выбрать предмет → ввести балл + тип + комментарий → Save

### CANTEEN_STAFF — `/dashboard/canteen/menu`
- Выбор даты (date picker)
- Управление блюдами: список + Add / Edit / Delete для каждого
- Форма: название, описание, цена, категория, калории, наличие

### PARENT — `/dashboard/parent`
- Имя ребёнка, класс
- Оценки (read-only, те же grade bars)
- Расписание (read-only)

---

## ОБЩИЕ КОМПОНЕНТЫ

Создай и используй переиспользуемые компоненты:

```
src/components/
├── layout/
│   ├── Sidebar.tsx          ← role-aware sidebar
│   ├── Topbar.tsx           ← breadcrumb + notifications + user menu
│   └── PageHeader.tsx       ← title + description + optional action button
├── ui/
│   ├── StatCard.tsx         ← colored border-l-4, icon, number, label
│   ├── DataTable.tsx        ← thead/tbody, hover rows, empty state
│   ├── Modal.tsx            ← overlay + content + close
│   ├── EmptyState.tsx       ← icon + heading + description + action
│   ├── StatusBadge.tsx      ← color по статусу
│   ├── GradeBar.tsx         ← colored progress bar по score
│   ├── Avatar.tsx           ← инициалы с цветным bg
│   ├── LoadingSpinner.tsx
│   └── ConfirmDialog.tsx
```

---

## СТЕК ТЕХНОЛОГИЙ

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "@prisma/client": "latest",
    "prisma": "latest",
    "bcryptjs": "^2.4.3",
    "jose": "^5.x",
    "zod": "^3.x",
    "lucide-react": "latest",
    "date-fns": "^3.x"
  }
}
```

---

## ПОРЯДОК ВЫВОДА ФАЙЛОВ

Выводи в этом порядке, **полный код каждого файла**. Никаких `// TODO` или `// add logic here`. Всё реализовано:

1. `prisma/schema.prisma`
2. `prisma/seed.ts`
3. `.env.example`
4. `src/lib/auth.ts` — JWT утилиты, helpers сессии
5. `src/middleware.ts` — защита маршрутов по роли
6. `src/lib/prisma.ts` — Prisma client singleton
7. Все файлы `src/app/api/...`
8. `src/components/layout/Sidebar.tsx`
9. `src/components/layout/Topbar.tsx`
10. `src/components/ui/*` — все shared компоненты
11. `src/app/dashboard/layout.tsx`
12. `src/app/auth/login/page.tsx`
13. Все страницы по ролям (admin → teacher → student → canteen → parent)

---

## КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

- Никаких моковых данных в UI — только реальные данные из БД через API или Server Components
- Никаких пустых страниц — каждая страница либо показывает данные, либо proper empty state
- Sidebar — только вертикальный список с иконками, **никаких pill-badges и flex-wrap**
- Каждая роль видит строго свои данные — middleware + server-side фильтрация
- Форма смены пароля работает для всех ролей
- Все статус-бейджи цветные и консистентные во всём приложении
- Мобильный sidebar — hamburger menu (используй React state, не CSS-only)
- При `mustChangePass = true` — принудительный редирект на смену пароля
