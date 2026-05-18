# Campus Student Portal — Полный промт (финальная версия)

Ты переписываешь существующий Campus Student Portal. Старая версия работает плохо: функции рендерятся но не работают, у ролей нет чётких полномочий, архитектура непоследовательная, админ только наблюдает вместо того чтобы управлять. Твоя задача — сделать всё правильно с нуля по архитектуре, сохранив стек.

---

## СТЕК

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Prisma ORM + PostgreSQL
- bcryptjs (12 rounds) — хэш паролей
- jose — JWT в httpOnly + secure + sameSite=lax cookie, 7 дней
- zod — валидация всех входящих данных на каждом API route
- lucide-react — иконки
- date-fns — работа с датами

---

## ЧТО РЕАЛИЗУЕМ

Из таблицы MoSCoW реализуем все функции кроме Won't (№22–35). Итого 21 функция:

| № | Функция | Приоритет |
|---|---------|-----------|
| 1 | Вход через университетский email + пароль | Must |
| 2 | Расписание занятий | Must |
| 3 | Уведомления об изменениях в расписании (in-app) | Must |
| 4 | Электронная зачётная книжка | Must |
| 5 | Оценки и академические результаты | Must |
| 6 | Профиль студента (просмотр + редактирование) | Must |
| 7 | Лента новостей университета | Should |
| 8 | Каталог преподавателей и контакты | Should |
| 9 | Столовая — меню на сегодня и на неделю | Should |
| 10 | Календарь студенческих мероприятий | Should |
| 11 | Запрос официальных документов | Should |
| 12 | Отслеживание статуса запроса документов | Should |
| 13 | Уведомления об академической задолженности (in-app) | Should |
| 14 | Доска объявлений (продажа/покупка учебников) | Could |
| 15 | Регистрация на мероприятия | Could |
| 16 | Портфолио / достижения студента | Could |
| 17 | Новости студенческого совета | Could |
| 18 | Бюро находок | Could |
| 19 | Расписание спортивных секций | Could |
| 20 | Запись в спортивные секции | Could |
| 21 | Тёмная тема (Dark mode) | Could |

Дополнительно реализуем (критично для работы системы):
- Посещаемость (PRESENT / ABSENT / LATE) — ведёт учитель
- Академический рейтинг студентов (внутри класса + глобальный)
- Управление пользователями, классами, расписанием — для Admin
- Смена пароля для всех ролей
- Автоматические уведомления родителям при пропуске и новой оценке

---

## РОЛИ — ЧТО КАЖДАЯ РОЛЬ РЕАЛЬНО ДЕЛАЕТ

### ADMIN

Администратор управляет всей системой. Не наблюдает — управляет.

**Управление пользователями:**
- Создать пользователя с любой ролью (имя, email, пароль, телефон, роль)
- Редактировать данные любого пользователя
- Заблокировать / разблокировать аккаунт (`isActive` флаг)
- Сбросить пароль пользователя (задать временный, флаг `mustChangePass = true`)
- Удалить пользователя (с подтверждением через ConfirmDialog)
- Фильтровать по роли, поиск по имени/email

**Управление классами:**
- Создать класс (название, год)
- Назначить классного руководителя из списка учителей
- Добавить / убрать студента из класса
- Назначить преподавателя на предмет в классе
- Перевести студента из одного класса в другой
- Удалить класс (только если нет студентов)

**Управление расписанием:**
- Создать слот: класс + предмет + учитель + день недели + время начала/конца + кабинет
- Редактировать слот
- Добавить changeNote к слоту → студенты класса получают уведомление автоматически
- Удалить слот

**Запросы документов:**
- Видеть все запросы всех студентов
- Менять статус: PENDING → IN_PROGRESS → DONE / REJECTED
- Добавить административную заметку
- При смене статуса студент получает in-app уведомление автоматически

**Аналитика на дашборде:**
- Stat cards: всего студентов, преподавателей, классов, ожидающих запросов
- Таблица классов по успеваемости (средний GPA)
- Таблица предметов в зоне риска (средний балл < 65)
- Сводная посещаемость по классам с фильтрами
- Последние 5 зарегистрированных пользователей

**Объявления:**
- Создать для всех / для конкретной роли / для конкретного класса
- Закрепить (pinned) / открепить
- Удалить

---

### TEACHER

Учитель работает только со своими данными. Это жёсткое правило — проверка на каждом API route.

**Правило доступа:**
- Видит класс только если есть запись `ClassTeacher` где `teacherId = текущий учитель`
- Работает с предметом только если есть запись `TeacherSubject` где `teacherId = текущий учитель`
- Запрос к чужому классу или предмету → 403, без исключений

**Оценки:**
- Выставить оценку студенту своего класса по своему предмету (балл 0–100, тип, комментарий)
- Редактировать свою оценку
- Удалить свою оценку
- При выставлении новой оценки → студент и его родитель получают уведомление автоматически
- Видеть статистику по классу: средний балл, лучший студент, студенты < 65
- Экспортировать журнал оценок в CSV (реальный файл)

**Посещаемость:**
- Календарь слева → выбрать день → только свои пары в этот день справа
- Открыть пару → список студентов класса → PRESENT / ABSENT / LATE для каждого
- Поле заметки (появляется при ABSENT или LATE)
- Быстрые кнопки: «Все PRESENT», «Все ABSENT»
- Сохранение одним bulk upsert запросом
- Редактировать сохранённую посещаемость прошлых дней
- Будущие дни — открыть можно, сохранить нельзя
- Цветные точки на календаре: зелёная (всё заполнено) / красная (есть незаполненные) / серая (нет пар)
- 3 ABSENT подряд у студента → автоматическое уведомление родителю

**Объявления:**
- Создать для конкретного своего класса
- Редактировать и удалять только свои объявления

**Мои классы:**
- Список своих классов
- В каждом классе: студенты, их оценки по предмету учителя, посещаемость

---

### STUDENT

Студент работает только со своими данными. Чужие данные физически недоступны.

**Расписание (функции №2, №3):**
- Недельная сетка: колонки Mon–Fri, строки — временные слоты
- Каждая ячейка: предмет, кабинет, преподаватель
- Слоты с changeNote → amber подсветка + текст изменения
- Пустые ячейки → dashed border

**Оценки и зачётная книжка (функции №4, №5):**
- GPA (с учётом кредитов) показан крупно сверху
- По каждому предмету: score bar цветной (≥80 зелёный / 65–79 жёлтый / <65 красный), все оценки с типом/датой/комментарием
- GPA < 2.0 или предмет < 50 → красный banner «Академическая задолженность»
- Фильтр по семестру
- Полная история в таблице: Предмет | Тип | Балл | Дата | Преподаватель | Комментарий

**Посещаемость:**
- Сводка: предмет | всего | present | absent | late | %
- % цветной (≥85 зелёный / 75–84 жёлтый / <75 красный + предупреждение о риске)
- Клик на предмет → детальная история по датам

**Профиль (функция №6):**
- Редактировать: имя, фамилия, телефон
- Read-only: код студента, класс, год, email
- Смена пароля: текущий → новый (мин. 8 символов + цифра) → подтверждение

**Документы (функции №11, №12):**
- Подать запрос: тип + описание
- Список своих запросов с таймлайном: PENDING → IN_PROGRESS → DONE как шаги с иконками
- Заметка администратора показана если есть
- При смене статуса приходит in-app уведомление

**Уведомления (функции №3, №13):**
- Список: иконка + заголовок + текст + время
- Непрочитанные выделены, счётчик в sidebar
- Клик → прочитано
- «Отметить все как прочитанные»
- Типы: изменение расписания, новая оценка, статус документа, академическая задолженность, пропуск

**Новости (функция №7):** заголовок, текст, дата, автор, категория

**Преподаватели (функция №8):** карточки с инициалами, именем, кафедрой, предметами, email. Поиск по имени/кафедре

**Столовая (функция №9):**
- Таб-навигация по дням недели (Пн–Пт)
- Секции: ЗАВТРАК | ОБЕД | ПЕРЕКУС | НАПИТКИ
- Каждое блюдо: название, описание, цена (жирно), калории, наличие, кнопки 👍/👎

**Мероприятия (функции №10, №15):**
- Карточки: название, дата, место, свободных мест
- Зарегистрироваться / отменить (оптимистичный UI)
- Прошедшие затемнены, «Мест нет» если заполнено

**Доска объявлений (функция №14):**
- Вкладки: Учебники | Вещи | Услуги
- Создать пост: заголовок, описание, категория, цена (опционально), контакт
- Удалить / закрыть только свой пост

**Портфолио (функция №16):**
- Bio (редактируемый)
- Достижения: карточки с категорией, названием, описанием, датой
- Добавить / редактировать / удалить своё достижение
- Видно преподавателям и родителям (read-only)

**Новости студсовета (функция №17):** лента постов

**Бюро находок (функция №18):**
- Список предметов с фильтром по статусу (LOST / FOUND / CLAIMED)
- Сообщить о находке/пропаже (форма)
- Отметить свой предмет как CLAIMED

**Спорт (функции №19, №20):**
- Карточки секций: тренер, расписание, место, места
- Записаться / отменить
- «Мест нет» если заполнено

**Рейтинг:**
- Глобальный топ-10 (🥇🥈🥉 для первых трёх)
- Рейтинг внутри класса
- Текущий студент всегда подсвечен indigo

**Тёмная тема (функция №21):**
- Переключатель в sidebar
- Сохраняется в UserPreference + localStorage
- Все страницы с dark: классами Tailwind

---

### CANTEEN_STAFF

Только управление меню. Нет доступа к академическим данным.

- Выбрать дату (date picker)
- Добавить блюдо: название, описание, цена, категория, калории
- Редактировать / удалить блюдо
- Отметить блюдо недоступным (не удаляя)
- Копировать меню с другого дня (быстрое заполнение)

---

### PARENT

Только чтение данных своего ребёнка. Ничего не меняет.

- Имя, класс, год ребёнка
- Оценки (grade bars, read-only)
- Посещаемость (сводка + история, read-only)
- Расписание (недельная сетка, read-only)
- Уведомления: новая оценка, пропуск, 3 пропуска подряд
- Смена своего пароля

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
  id             String          @id @default(cuid())
  email          String          @unique
  passwordHash   String
  role           Role            @default(STUDENT)
  firstName      String
  lastName       String
  phone          String?
  avatarUrl      String?
  isActive       Boolean         @default(true)
  mustChangePass Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  student        Student?
  teacher        Teacher?
  parent         Parent?
  notifications  Notification[]
  announcements  Announcement[]
  lostFoundItems LostFoundItem[]
  bulletinPosts  BulletinPost[]
  canteenLikes   CanteenLike[]
  preference     UserPreference?
}

model UserPreference {
  id       String  @id @default(cuid())
  userId   String  @unique
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  darkMode Boolean @default(false)
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  CANTEEN_STAFF
  PARENT
}

model Student {
  id                  String               @id @default(cuid())
  userId              String               @unique
  user                User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  studentCode         String               @unique
  classId             String?
  class               Class?               @relation(fields: [classId], references: [id])
  year                Int
  enrolledAt          DateTime             @default(now())
  grades              Grade[]
  documentRequests    DocumentRequest[]
  eventRegistrations  EventRegistration[]
  sportsRegistrations SportsRegistration[]
  parents             Parent[]
  attendances         Attendance[]
  portfolio           Portfolio?
  ranking             AcademicRanking?
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
  attendances   Attendance[]
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
  attendances   Attendance[]
}

model Subject {
  id          String           @id @default(cuid())
  name        String
  code        String           @unique
  credits     Int              @default(3)
  teachers    TeacherSubject[]
  classes     ClassSubject[]
  grades      Grade[]
  schedule    ScheduleItem[]
  attendances Attendance[]
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
  id          String       @id @default(cuid())
  classId     String
  subjectId   String
  teacherId   String
  dayOfWeek   DayOfWeek
  startTime   String
  endTime     String
  room        String
  changeNote  String?
  updatedAt   DateTime     @updatedAt
  class       Class        @relation(fields: [classId], references: [id])
  subject     Subject      @relation(fields: [subjectId], references: [id])
  attendances Attendance[]
}

enum DayOfWeek {
  MON
  TUE
  WED
  THU
  FRI
}

model Grade {
  id        String    @id @default(cuid())
  studentId String
  subjectId String
  teacherId String
  score     Int
  type      GradeType
  comment   String?
  semester  String
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
  createdAt       DateTime            @default(now())
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
  id          String        @id @default(cuid())
  menuId      String
  menu        CanteenMenu   @relation(fields: [menuId], references: [id], onDelete: Cascade)
  name        String
  description String?
  price       Float
  category    MealCategory
  available   Boolean       @default(true)
  calories    Int?
  likes       CanteenLike[]
}

model CanteenLike {
  id     String      @id @default(cuid())
  itemId String
  item   CanteenItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId String
  user   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  isLike Boolean
  @@unique([itemId, userId])
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
  isClosed    Boolean  @default(false)
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
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  read      Boolean          @default(false)
  link      String?
  createdAt DateTime         @default(now())
}

enum NotificationType {
  SCHEDULE_CHANGE
  NEW_GRADE
  DOCUMENT_STATUS
  ACADEMIC_DEBT
  ATTENDANCE_MISS
  GENERAL
}

model CouncilNews {
  id          String   @id @default(cuid())
  title       String
  content     String
  authorName  String
  category    String
  publishedAt DateTime @default(now())
}

model UniversityNews {
  id          String   @id @default(cuid())
  title       String
  content     String
  category    String
  authorId    String
  publishedAt DateTime @default(now())
}

model Portfolio {
  id           String                 @id @default(cuid())
  studentId    String                 @unique
  student      Student                @relation(fields: [studentId], references: [id])
  bio          String?
  achievements PortfolioAchievement[]
}

model PortfolioAchievement {
  id          String    @id @default(cuid())
  portfolioId String
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  title       String
  description String
  date        DateTime
  category    String
}

model AcademicRanking {
  id        String   @id @default(cuid())
  studentId String   @unique
  student   Student  @relation(fields: [studentId], references: [id])
  gpa       Float
  rank      Int
  classRank Int
  semester  String
  updatedAt DateTime @updatedAt
}
```

---

## SEED ДАННЫЕ (`prisma/seed.ts`)

**Пользователи:**
- Admin: `admin@university.edu` / `Admin123!`
- 3 учителя: `math@university.edu` / `cs@university.edu` / `physics@university.edu` — пароль `Teacher123!`
- Canteen: `canteen@university.edu` / `Canteen123!`
- Parent: `parent@university.edu` / `Parent123!` (привязан к первому студенту CS-101)
- 12 студентов (6 в CS-101, 6 в CS-201) — пароль `Student123!`

**Классы и предметы:**
- CS-101 (1 курс): Discrete Math (3 кредита), Web Development (4 кредита), Physics (3 кредита)
- CS-201 (2 курс): Database Systems (4 кредита), Algorithms (4 кредита), Physics (3 кредита)
- Каждый предмет привязан к своему учителю через TeacherSubject и ClassTeacher

**Расписание:** полное Mon–Fri, 3 пары/день для каждого класса, один слот с `changeNote`

**Оценки:** все типы (QUIZ, MIDTERM, FINAL, ASSIGNMENT), семестр `2024-S1`
- Один студент намеренно < 50 по одному предмету (академическая задолженность)
- Один студент GPA 4.8 (лидер рейтинга)

**Посещаемость:** за последние 10 рабочих дней, 80% PRESENT / 12% ABSENT / 8% LATE
- Один студент < 75% по одному предмету (предупреждение о риске)
- Один студент 3 ABSENT подряд по одному предмету (уведомление родителю)

**Остальное:**
- 3 объявления (1 pinned, 1 для STUDENT, 1 для класса CS-101)
- 2 предстоящих мероприятия + 1 прошедшее
- Меню столовой на сегодня и следующие 4 дня (все категории)
- 3 запроса документов: PENDING, IN_PROGRESS, DONE
- 5 lost & found предметов (разные статусы)
- 2 спортивные секции (одна заполнена)
- 3 новости студсовета, 3 новости университета
- Portfolio с достижениями для 2 студентов
- Rankings для всех студентов (с classRank)
- 3–5 уведомлений для каждого пользователя разных типов
- 3 поста на доске объявлений

---

## АВТОМАТИЧЕСКИЕ УВЕДОМЛЕНИЯ

Реализуй хелпер `src/lib/notifications.ts` с функцией:

```typescript
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
): Promise<void>
```

Вызывается в API при следующих событиях:

| Событие | Где вызывается | Кому | Тип |
|---------|---------------|------|-----|
| Новая оценка выставлена | `POST /api/grades` | Студенту + родителю | NEW_GRADE |
| Статус документа изменён | `PATCH /api/admin/document-requests/[id]` | Студенту | DOCUMENT_STATUS |
| Добавлен changeNote к слоту | `PATCH /api/admin/schedule/[id]` | Всему классу | SCHEDULE_CHANGE |
| GPA студента упал < 2.0 | `POST /api/grades` | Студенту | ACADEMIC_DEBT |
| 3 ABSENT подряд у студента | `POST /api/teacher/attendance/session` | Родителю | ATTENDANCE_MISS |

---

## ХЕЛПЕР ДОСТУПА УЧИТЕЛЯ

`src/lib/teacher-access.ts`:

```typescript
// Бросает ошибку 403 если teacherId не имеет доступа к classId
export async function assertTeacherClassAccess(teacherId: string, classId: string): Promise<void>

// Бросает ошибку 403 если teacherId не имеет доступа к subjectId
export async function assertTeacherSubjectAccess(teacherId: string, subjectId: string): Promise<void>

// Возвращает только classId к которым учитель прикреплён
export async function getTeacherClassIds(teacherId: string): Promise<string[]>

// Возвращает только subjectId к которым учитель прикреплён
export async function getTeacherSubjectIds(teacherId: string): Promise<string[]>
```

Этот хелпер вызывается в начале каждого teacher API route перед любой операцией.

---

## API МАРШРУТЫ

Каждый route обязан:
1. Проверить JWT из cookie → `{ userId, role }`
2. Проверить `isActive` → 401 если заблокирован
3. Проверить роль → 403 если нет доступа
4. Для TEACHER → дополнительно вызвать teacher-access хелпер
5. Валидировать body через zod
6. Вернуть `{ data: ... }` или `{ error: "..." }` с правильным HTTP кодом

```
AUTH
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/change-password

PREFERENCES
GET    /api/preferences
PATCH  /api/preferences

ADMIN
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/[id]
DELETE /api/admin/users/[id]
PATCH  /api/admin/users/[id]/toggle-active
POST   /api/admin/users/[id]/reset-password
GET    /api/admin/classes
POST   /api/admin/classes
PATCH  /api/admin/classes/[id]
DELETE /api/admin/classes/[id]
POST   /api/admin/classes/[id]/students
DELETE /api/admin/classes/[id]/students/[sid]
POST   /api/admin/classes/[id]/teachers
DELETE /api/admin/classes/[id]/teachers/[tid]
POST   /api/admin/students/[id]/transfer       → { newClassId }
GET    /api/admin/schedule
POST   /api/admin/schedule
PATCH  /api/admin/schedule/[id]
DELETE /api/admin/schedule/[id]
GET    /api/admin/document-requests
PATCH  /api/admin/document-requests/[id]
POST   /api/admin/rankings/refresh
GET    /api/admin/attendance
GET    /api/admin/analytics
GET    /api/admin/announcements
POST   /api/admin/announcements
PATCH  /api/admin/announcements/[id]
DELETE /api/admin/announcements/[id]

TEACHER
GET    /api/teacher/my-classes
GET    /api/teacher/my-classes/[id]/students
GET    /api/grades?classId=&subjectId=&semester=
POST   /api/grades
PATCH  /api/grades/[id]
DELETE /api/grades/[id]
GET    /api/grades/export?classId=&subjectId=   → реальный CSV файл
GET    /api/grades/stats?classId=&subjectId=
GET    /api/teacher/announcements
POST   /api/teacher/announcements
PATCH  /api/teacher/announcements/[id]
DELETE /api/teacher/announcements/[id]
GET    /api/teacher/attendance?date=
GET    /api/teacher/attendance/session?scheduleItemId=&date=
POST   /api/teacher/attendance/session
PATCH  /api/teacher/attendance/[id]

STUDENT
GET    /api/student/grades?semester=
GET    /api/student/schedule
GET    /api/student/attendance
GET    /api/student/profile
PATCH  /api/student/profile
GET    /api/student/document-requests
POST   /api/student/document-requests
POST   /api/student/events/[id]/register
DELETE /api/student/events/[id]/register
POST   /api/student/sports/[id]/register
DELETE /api/student/sports/[id]/register
GET    /api/student/portfolio
POST   /api/student/portfolio/achievements
PATCH  /api/student/portfolio/achievements/[id]
DELETE /api/student/portfolio/achievements/[id]

SHARED
GET    /api/announcements
GET    /api/events
GET    /api/canteen/menu?date=
GET    /api/canteen/menu/week
POST   /api/canteen/menu                          → CANTEEN_STAFF + ADMIN
POST   /api/canteen/menu/[id]/items               → CANTEEN_STAFF + ADMIN
PATCH  /api/canteen/menu/[id]/items/[itemId]      → CANTEEN_STAFF + ADMIN
DELETE /api/canteen/menu/[id]/items/[itemId]      → CANTEEN_STAFF + ADMIN
POST   /api/canteen/menu/[id]/copy-from           → CANTEEN_STAFF + ADMIN, body: { fromDate }
POST   /api/canteen/items/[id]/like               → все роли, body: { isLike: boolean }
GET    /api/teachers
GET    /api/notifications
PATCH  /api/notifications/[id]/read
PATCH  /api/notifications/read-all
GET    /api/lost-found
POST   /api/lost-found
PATCH  /api/lost-found/[id]
GET    /api/bulletin
POST   /api/bulletin
DELETE /api/bulletin/[id]                         → только свой пост
PATCH  /api/bulletin/[id]/close                   → только свой пост
GET    /api/sports
GET    /api/rankings
GET    /api/council-news
GET    /api/university-news
```

---

## СТРУКТУРА ПАПОК

```
src/
├── app/
│   ├── auth/login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── change-password/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── classes/page.tsx
│   │   │   ├── classes/[id]/page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   ├── document-requests/page.tsx
│   │   │   ├── announcements/page.tsx
│   │   │   └── attendance/page.tsx
│   │   ├── teacher/
│   │   │   ├── page.tsx
│   │   │   ├── my-classes/page.tsx
│   │   │   ├── my-classes/[id]/page.tsx
│   │   │   ├── grades/page.tsx
│   │   │   ├── announcements/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   └── attendance/[scheduleItemId]/page.tsx
│   │   ├── student/
│   │   │   ├── page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   ├── grades/page.tsx
│   │   │   ├── gradebook/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   ├── events/page.tsx
│   │   │   ├── canteen/page.tsx
│   │   │   ├── news/page.tsx
│   │   │   ├── announcements/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── teachers/page.tsx
│   │   │   ├── bulletin/page.tsx
│   │   │   ├── lost-found/page.tsx
│   │   │   ├── sports/page.tsx
│   │   │   ├── portfolio/page.tsx
│   │   │   ├── council-news/page.tsx
│   │   │   ├── rankings/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── canteen/
│   │   │   ├── page.tsx
│   │   │   └── menu/page.tsx
│   │   └── parent/
│   │       ├── page.tsx
│   │       ├── grades/page.tsx
│   │       ├── attendance/page.tsx
│   │       └── schedule/page.tsx
│   └── api/...
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   └── ui/
│       ├── StatCard.tsx
│       ├── DataTable.tsx
│       ├── Modal.tsx
│       ├── ConfirmDialog.tsx
│       ├── EmptyState.tsx
│       ├── StatusBadge.tsx
│       ├── GradeBar.tsx
│       ├── Avatar.tsx
│       └── LoadingSpinner.tsx
└── lib/
    ├── prisma.ts
    ├── auth.ts
    ├── api-auth.ts
    ├── notifications.ts
    └── teacher-access.ts
```

---

## SIDEBAR ПО РОЛЯМ

Sidebar — только вертикальный список. Никаких pill-badges, flex-wrap, chip меток.

Каждый пункт: `[Icon 20px]  Название  [badge?]`
- Активный: `bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600 rounded-r-lg`
- Неактивный: `text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg`
- Все items: `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors`
- Заголовок секции: `text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mt-5 mb-1`

**ADMIN:** Система (Дашборд, Пользователи, Классы, Расписание) | Академическое (Посещаемость, Документы) | Коммуникации (Объявления) | Аккаунт (Профиль, Сменить пароль, Выйти)

**TEACHER:** Академическое (Дашборд, Мои классы, Оценки, Посещаемость) | Коммуникации (Объявления) | Кампус (Новости, Столовая) | Аккаунт (Профиль, Сменить пароль, Выйти)

**STUDENT:** Академическое (Дашборд, Расписание, Оценки, Зачётная книжка, Посещаемость) | Кампус (Новости, Мероприятия, Столовая, Преподаватели) | Сервисы (Документы, Уведомления[N], Объявления, Доска объявлений, Бюро находок, Спорт, Портфолио, Совет студентов, Рейтинг) | Аккаунт (Профиль, Тёмная тема [toggle], Выйти)

**CANTEEN_STAFF:** Меню (Дашборд, Управление меню) | Аккаунт (Профиль, Сменить пароль, Выйти)

**PARENT:** Мой ребёнок (Дашборд, Оценки, Посещаемость, Расписание) | Аккаунт (Уведомления[N], Сменить пароль, Выйти)

---

## DESIGN SYSTEM

```
Primary:  indigo-600 / indigo-50
Success:  emerald-600 / emerald-50
Warning:  amber-600 / amber-50
Danger:   rose-600 / rose-50

Cards: bg-white rounded-xl shadow-sm border border-slate-100 p-5
       hover:shadow-md transition-shadow duration-200

Stat cards: border-l-4, число text-3xl font-bold, метка text-sm text-slate-500,
            иконка top-right 40×40 rounded-lg цветной bg

Tables: thead bg-slate-50 text-xs uppercase font-semibold border-b
        tr border-b hover:bg-slate-50 transition-colors

Buttons: Primary bg-indigo-600 / Secondary border / Danger bg-rose-600
         Все: px-4 py-2 rounded-lg text-sm font-medium, loading = disabled + spinner

Inputs: border border-slate-300 rounded-lg px-3 py-2 text-sm
        focus:ring-2 focus:ring-indigo-500
        Error: border-rose-400 + rose-600 text-xs под полем

Badges: PENDING amber / IN_PROGRESS blue / DONE emerald / REJECTED rose
        px-2.5 py-0.5 rounded-full text-xs font-medium

Grade bars: ≥80 emerald / 65–79 amber / <65 rose

Empty states: emoji 48px + h3 + описание + кнопка действия

Dark mode: все компоненты с dark: классами Tailwind
```

---

## ЭКСПОРТ ОЦЕНОК В CSV

`GET /api/grades/export?classId=&subjectId=` возвращает реальный файл:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="grades-CS101-WebDev-2024S1.csv"

Студент,Тип,Балл,Дата,Комментарий
Ali Valiyev,QUIZ,85,2024-01-15,Хорошая работа
Malika Yusupova,MIDTERM,72,2024-02-01,
```

---

## ПОРЯДОК ВЫВОДА ФАЙЛОВ

Полный код каждого файла. Никаких `// TODO`, `// add logic here`, заглушек.

1. `prisma/schema.prisma`
2. `prisma/seed.ts`
3. `.env.example`
4. `src/lib/prisma.ts`
5. `src/lib/auth.ts`
6. `src/lib/api-auth.ts`
7. `src/lib/notifications.ts`
8. `src/lib/teacher-access.ts`
9. `src/middleware.ts`
10. Все `src/app/api/**` файлы
11. `src/components/layout/Sidebar.tsx`
12. `src/components/layout/Topbar.tsx`
13. `src/components/ui/*`
14. `src/app/dashboard/layout.tsx`
15. `src/app/auth/login/page.tsx`
16. `src/app/dashboard/change-password/page.tsx`
17. Все страницы: admin → teacher → student → canteen → parent

---

## КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

- **Никаких моковых данных** — только реальные данные из БД
- **Никаких пустых страниц** — каждая показывает данные или EmptyState
- **Sidebar** — только вертикальный список с иконками, никаких pill/chip/flex-wrap
- **Учитель** — физически не может получить данные чужого класса/предмета (проверка на каждом route)
- **isActive = false** → 401 при любом запросе, включая логин
- **mustChangePass = true** → middleware редиректит на /dashboard/change-password, пока не сменит
- **Уведомления** — создаются автоматически при событиях в API, не вручную
- **CSV экспорт** — реальный файл, не кнопка-заглушка
- **3 пропуска подряд** → уведомление родителю реализовано в `POST /api/teacher/attendance/session`
- **changeNote на слоте** → уведомления всему классу реализованы в `PATCH /api/admin/schedule/[id]`
- **Dark mode** — все страницы с dark: классами, состояние в UserPreference + localStorage
- **GPA** считается с учётом кредитов каждого предмета: `sum(score * credits) / sum(credits)`
