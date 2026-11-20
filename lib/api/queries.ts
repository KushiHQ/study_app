// GraphQL documents used by the app (SPEC §7). Plain strings: they run on the
// SvelteKit server (load functions, actions) or through /api/graphql.

const USER = `id email name school isTeacher staffRole department { id slug name courseCount } level { code name }`;
export const CARD = `code slug title nickname icon summary unitCount lessonCount minutes healthNotice
	offerings { department { id slug name courseCount } level { code name } }
	aliases { school code title covered total }`;
const LESSON_OUTLINE = `id title tagline minutes locked`;
export const PROGRESS = `courseSlug courseTitle courseCode covered examReady completedLessons startedLessons
	lessonMastery { lessonId mastery attempts }
	nextLesson { ${LESSON_OUTLINE} }
	cardsDue practiceDone labsVisited finalQuizBest
	enrollment { examDate studyDays startedAt }`;
const OUTLINE = `card { ${CARD} } version welcome examShape
	units { id title summary free quizCount lessons { ${LESSON_OUTLINE} } }
	labs { id title component locked }
	practiceCount flashcardCount finalQuizCount freeUnits viewerHasAccess`;
const SUB = `id status method currentPeriodEnd cancelAtPeriodEnd plan { code name interval priceKobo active }`;
const AUTH = `accessToken refreshToken expiresIn user { ${USER} }`;

export const ME = `query Me { me { ${USER} } }`;

export const HOME = `query Home {
	today { items { kind courseSlug courseTitle refId title minutes } streakDays studiedToday daysToExam behindBy }
	myCourses { ${PROGRESS} }
	access { hasAccess until source }
}`;
export const LANDING = `query Landing { departments { id slug name courseCount } plans { code name interval priceKobo active } }`;

export const CATALOGUE = `query Catalogue($d: String, $l: String, $withCourses: Boolean!) {
	departments { id slug name courseCount }
	levels(departmentSlug: $d) { code name }
	courses(departmentSlug: $d, levelCode: $l) @include(if: $withCourses) { ${CARD} }
}`;
export const SEARCH = `query Search($q: String!, $limit: Int) { searchCourses(query: $q, limit: $limit) { ${CARD} } }`;
export const LEVELS_FOR = `query LevelsFor($d: String) { levels(departmentSlug: $d) { code name } }`;
export const DEPARTMENTS_LEVELS = `query DL { departments { id slug name courseCount } levels { code name } }`;

export const COURSE = `query Course($slug: String!, $signedIn: Boolean!, $preview: ID) {
	course(slug: $slug, previewVersionId: $preview) { ${OUTLINE} }
	courseProgress(courseSlug: $slug, previewVersionId: $preview) @include(if: $signedIn) { ${PROGRESS} }
	today @include(if: $signedIn) { items { kind courseSlug courseTitle refId title minutes } streakDays studiedToday daysToExam behindBy }
	plans { code name interval priceKobo active }
}`;

export const LESSON = `query Lesson($slug: String!, $id: ID!, $preview: ID) {
	lesson(courseSlug: $slug, lessonId: $id, previewVersionId: $preview) { id unitId courseSlug version lesson checks prev { ${LESSON_OUTLINE} } next { ${LESSON_OUTLINE} } }
}`;
export const UNIT_QUIZ = `query UnitQuiz($slug: String!, $id: ID!, $preview: ID) { unitQuiz(courseSlug: $slug, unitId: $id, previewVersionId: $preview) }`;
export const FINAL_QUIZ = `query FinalQuiz($slug: String!, $preview: ID) { finalQuiz(courseSlug: $slug, previewVersionId: $preview) }`;
export const PRACTICE = `query Practice($slug: String!, $preview: ID) { practice(courseSlug: $slug, previewVersionId: $preview) }`;
export const FLASHCARDS = `query Flashcards($slug: String!, $preview: ID) { flashcards(courseSlug: $slug, previewVersionId: $preview) }`;
export const LAB = `query Lab($slug: String!, $id: ID!, $preview: ID) { lab(courseSlug: $slug, labId: $id, previewVersionId: $preview) }`;

export const ENROLL = `mutation Enroll($slug: String!, $examDate: NaiveDate, $studyDays: [Int!]) { enroll(courseSlug: $slug, examDate: $examDate, studyDays: $studyDays) { ${PROGRESS} } }`;
export const UPDATE_ENROLLMENT = `mutation UpdateEnrollment($slug: String!, $examDate: NaiveDate, $studyDays: [Int!]) { updateEnrollment(courseSlug: $slug, examDate: $examDate, studyDays: $studyDays) { ${PROGRESS} } }`;
export const SYNC = `mutation Sync($events: [ProgressEventInput!]!) { syncProgress(events: $events) }`;

export const REQUEST_CODE = `mutation RequestCode($email: String!) { requestEmailCode(email: $email) }`;
export const VERIFY_CODE = `mutation VerifyCode($email: String!, $code: String!, $device: String) { verifyEmailCode(email: $email, code: $code, deviceLabel: $device) { ${AUTH} } }`;
export const GOOGLE = `mutation Google($token: String!, $device: String) { signInWithGoogle(idToken: $token, deviceLabel: $device) { ${AUTH} } }`;
// The same three with first-touch attribution, used once the API accepts it (API_ACCEPTS_ATTRIBUTION=true).
export const REQUEST_CODE_A = `mutation RequestCode($email: String!, $attribution: AttributionInput) { requestEmailCode(email: $email, attribution: $attribution) }`;
export const VERIFY_CODE_A = `mutation VerifyCode($email: String!, $code: String!, $device: String, $attribution: AttributionInput) { verifyEmailCode(email: $email, code: $code, deviceLabel: $device, attribution: $attribution) { ${AUTH} } }`;
export const GOOGLE_A = `mutation Google($token: String!, $device: String, $attribution: AttributionInput) { signInWithGoogle(idToken: $token, deviceLabel: $device, attribution: $attribution) { ${AUTH} } }`;
export const SIGN_OUT = `mutation SignOut { signOut }`;
export const SIGN_OUT_DEVICE = `mutation SignOutDevice($id: ID!) { signOutDevice(id: $id) }`;
export const UPDATE_PROFILE = `mutation UpdateProfile($name: String, $departmentId: ID, $levelCode: String, $school: String, $isTeacher: Boolean) {
	updateProfile(name: $name, departmentId: $departmentId, levelCode: $levelCode, school: $school, isTeacher: $isTeacher) { ${USER} }
}`;
export const ACCOUNT = `query Account { devices { id label lastUsedAt current } departments { id slug name courseCount } levels { code name } }`;

export const BILLING = `query Billing { trialDays plans { code name interval priceKobo active } access { hasAccess until source } subscription { ${SUB} } payments { id txRef amountKobo status purpose method createdAt } }`;
export const START_CHECKOUT = `mutation StartCheckout($plan: String!, $method: PayMethod!) { startCheckout(planCode: $plan, method: $method) { link txRef } }`;
export const CONFIRM_CHECKOUT = `mutation Confirm($txRef: String!, $tx: String!) { confirmCheckout(txRef: $txRef, transactionId: $tx) { hasAccess until source } }`;
export const CANCEL = `mutation Cancel { cancelSubscription { ${SUB} } }`;

export const REQUEST_COURSE = `mutation RequestCourse($input: CourseRequestInput!) { requestCourse(input: $input) }`;
export const COMING_SOON = `query ComingSoon($d: String, $l: String, $q: String) { comingSoon(departmentSlug: $d, levelCode: $l, query: $q) }`;
export const CONTRIBUTIONS = `query Contributions { contributions }`;
export const SUBMIT_MATERIAL = `mutation SubmitMaterial($input: MaterialInput!) { submitMaterial(input: $input) }`;
export const FEEDBACK = `mutation Feedback($input: FeedbackInput!) { sendFeedback(input: $input) }`;

// Referrals and the wallet (study_server SPEC §5a)
const REFERRALS_FIELDS = `code link enabled rewardBps rewardKoboAtCurrentPrice minWithdrawalKobo invitedCount paidCount earnedKobo withdrawnKobo
	pendingWithdrawalKobo balanceKobo referredBy canApplyCode payoutAccount { bankCode bankName accountLast4 accountName }
	people { name joinedAt status rewardKobo rewardedAt } withdrawals { id amountKobo status bankName accountLast4 note createdAt paidAt }
	entries { id kind amountKobo note createdAt }`;
export const REFERRALS = `query Referrals { referrals { ${REFERRALS_FIELDS} } }`;
export const BANKS = `query Banks { banks { code name } }`;
export const APPLY_REFERRAL = `mutation ApplyReferral($code: String!) { applyReferralCode(code: $code) { referredBy canApplyCode } }`;
export const SET_PAYOUT_ACCOUNT = `mutation SetPayout($bank: String!, $number: String!) { setPayoutAccount(bankCode: $bank, accountNumber: $number) { bankCode bankName accountLast4 accountName } }`;
export const REQUEST_WITHDRAWAL = `mutation Withdraw($amount: Int) { requestWithdrawal(amountKobo: $amount) { ${REFERRALS_FIELDS} } }`;
export const CANCEL_WITHDRAWAL = `mutation CancelWithdrawal($id: ID!) { cancelWithdrawal(id: $id) { ${REFERRALS_FIELDS} } }`;
