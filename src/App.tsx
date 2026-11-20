import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  LogIn,
  LogOut,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { MakeupGuideView } from './components/MakeupGuideView';
import { MakeupStudioPanel } from './components/MakeupStudioPanel';
import { QuizPanel } from './components/QuizPanel';
import {
  RealisticModelCanvas,
  RealisticModelCanvasHandle,
} from './components/RealisticModelCanvas';
import { SavedFiguresView } from './components/SavedFiguresView';
import { TopicsOverviewView } from './components/TopicsOverviewView';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { getToolInfo, getZoneUnlockToolId, MAKEUP_PRODUCTS, MODELS } from './data/makeupCatalog';
import { ALL_PROBLEMS, PROBLEMS_BY_TOPIC } from './data/problems';
import {
  AnswerStats,
  AppliedMakeupState,
  BrushSize,
  DailyStatsMap,
  MakeupShade,
  MakeupStyle,
  MakeupToolMode,
  MakeupZoneId,
  ModelProfile,
  OST_TOPICS,
  OstTopic,
  SavedFigureRecord,
  TopicStatsMap,
  UnlockableToolId,
} from './types';
import { playTone } from './utils/sound';

type AppTab = 'studio' | 'saved' | 'guide' | 'topics';

const LOCAL_PROGRESS_KEY = 'glam_graph_local_progress_v1';

interface LocalProgressSnapshot {
  glamStars: number;
  totalQuestionsSolved: number;
  totalIncorrect: number;
  streak: number;
  solvedIds: string[];
  unlockedShades: string[];
  unlockedTools: UnlockableToolId[];
  topicStats: TopicStatsMap;
  dailyStats: DailyStatsMap;
}

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function trimDailyStats(stats: DailyStatsMap): DailyStatsMap {
  const keys = Object.keys(stats).sort();
  if (keys.length <= 90) return stats;
  const trimmed: DailyStatsMap = {};
  for (const key of keys.slice(-90)) {
    trimmed[key] = stats[key];
  }
  return trimmed;
}

function sanitizeStatsMap(raw: unknown, maxKeys: number): Record<string, AnswerStats> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, AnswerStats> = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, maxKeys);
  for (const [k, v] of entries) {
    if (!v || typeof v !== 'object') continue;
    const rec = v as { correct?: unknown; incorrect?: unknown };
    const correct =
      typeof rec.correct === 'number' && Number.isFinite(rec.correct)
        ? Math.max(0, Math.min(50000, Math.floor(rec.correct)))
        : 0;
    const incorrect =
      typeof rec.incorrect === 'number' && Number.isFinite(rec.incorrect)
        ? Math.max(0, Math.min(50000, Math.floor(rec.incorrect)))
        : 0;
    result[k] = { correct, incorrect };
  }
  return result;
}

function loadLocalProgress(): LocalProgressSnapshot {
  const empty: LocalProgressSnapshot = {
    glamStars: 0,
    totalQuestionsSolved: 0,
    totalIncorrect: 0,
    streak: 0,
    solvedIds: [],
    unlockedShades: [],
    unlockedTools: [],
    topicStats: {},
    dailyStats: {},
  };
  try {
    const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<LocalProgressSnapshot>;
    return {
      glamStars:
        typeof parsed.glamStars === 'number' && Number.isFinite(parsed.glamStars)
          ? Math.max(0, Math.floor(parsed.glamStars))
          : 0,
      totalQuestionsSolved:
        typeof parsed.totalQuestionsSolved === 'number' &&
        Number.isFinite(parsed.totalQuestionsSolved)
          ? Math.max(0, Math.floor(parsed.totalQuestionsSolved))
          : 0,
      totalIncorrect:
        typeof parsed.totalIncorrect === 'number' && Number.isFinite(parsed.totalIncorrect)
          ? Math.max(0, Math.floor(parsed.totalIncorrect))
          : 0,
      streak:
        typeof parsed.streak === 'number' && Number.isFinite(parsed.streak)
          ? Math.max(0, Math.floor(parsed.streak))
          : 0,
      solvedIds: Array.isArray(parsed.solvedIds)
        ? parsed.solvedIds.filter((v): v is string => typeof v === 'string').slice(0, 350)
        : [],
      unlockedShades: Array.isArray(parsed.unlockedShades)
        ? parsed.unlockedShades.filter((v): v is string => typeof v === 'string').slice(0, 200)
        : [],
      unlockedTools: Array.isArray(parsed.unlockedTools)
        ? parsed.unlockedTools.filter((v): v is UnlockableToolId => typeof v === 'string').slice(0, 60)
        : [],
      topicStats: sanitizeStatsMap(parsed.topicStats, 12),
      dailyStats: trimDailyStats(sanitizeStatsMap(parsed.dailyStats, 90)),
    };
  } catch {
    return empty;
  }
}

function saveLocalProgress(snapshot: LocalProgressSnapshot): void {
  try {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

function buildInitialLoadedShades(): Record<MakeupZoneId, MakeupShade> {
  const map = {} as Record<MakeupZoneId, MakeupShade>;
  for (const prod of MAKEUP_PRODUCTS) {
    map[prod.zone] = prod.shades.find((s) => s.starterUnlocked) || prod.shades[0];
  }
  return map;
}

function sanitizeDisplayName(user: User): string {
  const raw = (user.displayName || 'Student').trim();
  return (raw.length > 0 ? raw : 'Student').slice(0, 80);
}

function sanitizeTitle(raw: string): string {
  const trimmed = raw.trim();
  return (trimmed.length > 0 ? trimmed : 'My Studio Look').slice(0, 80);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('studio');
  const [selectedModel, setSelectedModel] = useState<ModelProfile>(MODELS[2]);
  const [activeZone, setActiveZone] = useState<MakeupZoneId>('blush');
  const [loadedShades, setLoadedShades] = useState<Record<MakeupZoneId, MakeupShade>>(
    buildInitialLoadedShades
  );
  const [makeup, setMakeup] = useState<AppliedMakeupState>({});
  const [brushSize, setBrushSize] = useState<BrushSize>('medium');
  const [toolMode, setToolMode] = useState<MakeupToolMode>('apply');
  const [showGuide, setShowGuide] = useState(false);

  const [clearAllSignal, setClearAllSignal] = useState(0);
  const [clearZoneSignal, setClearZoneSignal] = useState<{ zone: MakeupZoneId; seq: number } | null>(
    null
  );

  // OST Challenge & Unlock State (1 solved OST problem = +1 Glam Star)
  const initialLocal = useMemo(() => loadLocalProgress(), []);
  const [selectedTopic, setSelectedTopic] = useState<OstTopic | 'ALL'>('ALL');
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => new Set(initialLocal.solvedIds));
  const [glamStars, setGlamStars] = useState<number>(initialLocal.glamStars);
  const [totalQuestionsSolved, setTotalQuestionsSolved] = useState<number>(
    initialLocal.totalQuestionsSolved
  );
  const [totalIncorrect, setTotalIncorrect] = useState<number>(initialLocal.totalIncorrect);
  const [streak, setStreak] = useState<number>(initialLocal.streak);
  const [unlockedShades, setUnlockedShades] = useState<Set<string>>(
    () => new Set(initialLocal.unlockedShades)
  );
  const [unlockedTools, setUnlockedTools] = useState<Set<UnlockableToolId>>(
    () => new Set(initialLocal.unlockedTools)
  );
  const [topicStats, setTopicStats] = useState<TopicStatsMap>(initialLocal.topicStats);
  const [dailyStats, setDailyStats] = useState<DailyStatsMap>(initialLocal.dailyStats);
  const [muted, setMuted] = useState<boolean>(false);
  const [quizNotice, setQuizNotice] = useState<string | null>(null);

  // Firebase Auth & Saved Looks State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedFigures, setSavedFigures] = useState<SavedFigureRecord[]>([]);
  const [activeFigureId, setActiveFigureId] = useState<string | null>(null);

  // Save Look Modal State
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [lookTitleInput, setLookTitleInput] = useState<string>('');
  const [savingLook, setSavingLook] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const quizSectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<RealisticModelCanvasHandle | null>(null);

  // Keep latest progress in a ref so sync writes never read stale closures
  const progressRef = useRef<LocalProgressSnapshot>(initialLocal);

  useEffect(() => {
    const nextSnapshot: LocalProgressSnapshot = {
      glamStars,
      totalQuestionsSolved,
      totalIncorrect,
      streak,
      solvedIds: Array.from(solvedIds).slice(0, 350),
      unlockedShades: Array.from(unlockedShades).slice(0, 200),
      unlockedTools: Array.from(unlockedTools).slice(0, 60),
      topicStats,
      dailyStats: trimDailyStats(dailyStats),
    };
    progressRef.current = nextSnapshot;
    saveLocalProgress(nextSnapshot);
  }, [
    glamStars,
    totalQuestionsSolved,
    totalIncorrect,
    streak,
    solvedIds,
    unlockedShades,
    unlockedTools,
    topicStats,
    dailyStats,
  ]);

  // Ensure /users/{uid} exists before writing progress or subcollection figures
  const ensureUserProgressDoc = useCallback(async (currentUser: User) => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    let snap;
    try {
      snap = await getDoc(userDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
    }

    if (!snap.exists()) {
      const cur = progressRef.current;
      try {
        await setDoc(userDocRef, {
          ownerId: currentUser.uid,
          displayName: sanitizeDisplayName(currentUser),
          glamStars: cur.glamStars,
          totalQuestionsSolved: cur.totalQuestionsSolved,
          totalIncorrect: cur.totalIncorrect,
          streak: cur.streak,
          solvedIds: cur.solvedIds,
          unlockedShades: cur.unlockedShades,
          unlockedTools: cur.unlockedTools,
          topicStats: cur.topicStats,
          dailyStats: trimDailyStats(cur.dailyStats),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
      }
    }
  }, []);

  const persistProgress = useCallback(
    async (currentUser: User, next: LocalProgressSnapshot) => {
      await ensureUserProgressDoc(currentUser);
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, {
          displayName: sanitizeDisplayName(currentUser),
          glamStars: Math.max(0, Math.min(10000, next.glamStars)),
          totalQuestionsSolved: Math.max(0, Math.min(50000, next.totalQuestionsSolved)),
          totalIncorrect: Math.max(0, Math.min(50000, next.totalIncorrect)),
          streak: Math.max(0, Math.min(50000, next.streak)),
          solvedIds: next.solvedIds.slice(0, 350),
          unlockedShades: next.unlockedShades.slice(0, 200),
          unlockedTools: next.unlockedTools.slice(0, 60),
          topicStats: sanitizeStatsMap(next.topicStats, 12),
          dailyStats: trimDailyStats(sanitizeStatsMap(next.dailyStats, 90)),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    },
    [ensureUserProgressDoc]
  );

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setSavedFigures([]);
        setActiveFigureId(null);
      }
    });
    return () => unsub();
  }, []);

  // Firestore listeners for signed-in student progress & saved figures
  useEffect(() => {
    if (!user) return;

    let unsubUser: (() => void) | undefined;
    let unsubFigures: (() => void) | undefined;
    let cancelled = false;

    const initListeners = async () => {
      await ensureUserProgressDoc(user);
      if (cancelled) return;

      const userPath = `users/${user.uid}`;
      unsubUser = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();
          if (typeof data.glamStars === 'number') setGlamStars(data.glamStars);
          if (typeof data.totalQuestionsSolved === 'number') {
            setTotalQuestionsSolved(data.totalQuestionsSolved);
          }
          if (typeof data.totalIncorrect === 'number') {
            setTotalIncorrect(data.totalIncorrect);
          } else {
            setTotalIncorrect(0);
          }
          if (typeof data.streak === 'number') setStreak(data.streak);
          if (Array.isArray(data.solvedIds)) {
            setSolvedIds(new Set(data.solvedIds.filter((v): v is string => typeof v === 'string')));
          }
          if (Array.isArray(data.unlockedShades)) {
            setUnlockedShades(
              new Set(data.unlockedShades.filter((v): v is string => typeof v === 'string'))
            );
          }
          if (Array.isArray(data.unlockedTools)) {
            setUnlockedTools(
              new Set(
                data.unlockedTools.filter((v): v is UnlockableToolId => typeof v === 'string')
              )
            );
          }
          setTopicStats(sanitizeStatsMap(data.topicStats, 12));
          setDailyStats(trimDailyStats(sanitizeStatsMap(data.dailyStats, 90)));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, userPath);
        }
      );

      const figuresPath = `users/${user.uid}/figures`;
      const figuresQuery = query(
        collection(db, 'users', user.uid, 'figures'),
        where('ownerId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      unsubFigures = onSnapshot(
        figuresQuery,
        (snap) => {
          const list: SavedFigureRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: String(data.ownerId || user.uid),
              title: String(data.title || 'Saved Look'),
              modelId: String(data.modelId || 'maya'),
              thumbnailDataUrl: String(data.thumbnailDataUrl || ''),
              makeupState: (data.makeupState || {}) as AppliedMakeupState,
              zoneMasks: (data.zoneMasks || {}) as Record<string, string>,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          });
          setSavedFigures(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, figuresPath);
        }
      );
    };

    void initListeners();

    return () => {
      cancelled = true;
      unsubUser?.();
      unsubFigures?.();
    };
  }, [user, ensureUserProgressDoc]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || msg.includes('popup-closed-by-user')) {
        return;
      }
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const host = window.location.hostname || 'this domain';
        setAuthError(
          `Add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized domains to enable Google Sign-In here. Your quiz progress is still saved locally in this browser.`
        );
        return;
      }
      setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSelectModel = (model: ModelProfile) => {
    setSelectedModel(model);
  };

  const handleLoadShade = useCallback(
    (zone: MakeupZoneId, shade: MakeupShade) => {
      setToolMode('apply');
      setLoadedShades((prev) => ({ ...prev, [zone]: shade }));
      setMakeup((prev) => {
        const existing = prev[zone];
        if (!existing) return prev;
        return {
          ...prev,
          [zone]: {
            ...existing,
            shadeId: shade.id,
            hex: shade.hex,
            secondaryHex: shade.secondaryHex,
            finish: shade.finish,
          },
        };
      });
      playTone('apply', muted);
    },
    [muted]
  );

  const handleUnlockAndLoadShade = useCallback(
    (zone: MakeupZoneId, shade: MakeupShade) => {
      if (glamStars < shade.cost) {
        setQuizNotice(
          `Answer ${shade.cost} Algebra 1 OST question${
            shade.cost > 1 ? 's' : ''
          } to unlock "${shade.name}".`
        );
        quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const nextStars = glamStars - shade.cost;
      const nextShades = new Set(unlockedShades);
      nextShades.add(shade.id);

      setGlamStars(nextStars);
      setUnlockedShades(nextShades);
      setToolMode('apply');
      setLoadedShades((prev) => ({ ...prev, [zone]: shade }));
      setMakeup((prev) => {
        const existing = prev[zone];
        if (!existing) return prev;
        return {
          ...prev,
          [zone]: {
            ...existing,
            shadeId: shade.id,
            hex: shade.hex,
            secondaryHex: shade.secondaryHex,
            finish: shade.finish,
          },
        };
      });
      setQuizNotice(null);
      playTone('unlock', muted);

      if (user) {
        void persistProgress(user, {
          glamStars: nextStars,
          totalQuestionsSolved,
          totalIncorrect,
          streak,
          solvedIds: Array.from(solvedIds),
          unlockedShades: Array.from(nextShades),
          unlockedTools: Array.from(unlockedTools),
          topicStats,
          dailyStats,
        });
      }
    },
    [
      glamStars,
      unlockedShades,
      muted,
      user,
      persistProgress,
      totalQuestionsSolved,
      totalIncorrect,
      streak,
      solvedIds,
      unlockedTools,
      topicStats,
      dailyStats,
    ]
  );

  const handleUnlockTool = useCallback(
    (toolId: UnlockableToolId, onAfterUnlock?: () => void) => {
      if (unlockedTools.has(toolId)) {
        onAfterUnlock?.();
        return;
      }
      const info = getToolInfo(toolId);
      if (glamStars < info.cost) {
        setQuizNotice(
          `Answer ${info.cost} Algebra 1 OST question${
            info.cost > 1 ? 's' : ''
          } to unlock ${info.label}.`
        );
        quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const nextStars = glamStars - info.cost;
      const nextTools = new Set(unlockedTools);
      nextTools.add(toolId);

      setGlamStars(nextStars);
      setUnlockedTools(nextTools);
      setQuizNotice(null);
      playTone('unlock', muted);
      onAfterUnlock?.();

      if (user) {
        void persistProgress(user, {
          glamStars: nextStars,
          totalQuestionsSolved,
          totalIncorrect,
          streak,
          solvedIds: Array.from(solvedIds),
          unlockedShades: Array.from(unlockedShades),
          unlockedTools: Array.from(nextTools),
          topicStats,
          dailyStats,
        });
      }
    },
    [
      unlockedTools,
      glamStars,
      muted,
      user,
      persistProgress,
      totalQuestionsSolved,
      totalIncorrect,
      streak,
      solvedIds,
      unlockedShades,
      topicStats,
      dailyStats,
    ]
  );

  // Fired whenever the student physically moves/clicks her cursor on the portrait canvas
  const handleStrokeApplied = useCallback(
    (zone: MakeupZoneId, isApplying: boolean) => {
      if (!isApplying) return;
      const shade = loadedShades[zone];
      const product = MAKEUP_PRODUCTS.find((p) => p.zone === zone);
      if (!shade || !product) return;

      const defaultStyle: MakeupStyle = unlockedTools.has('style_classic') ? 'classic' : 'natural';

      setMakeup((prev) => {
        const existing = prev[zone];
        if (existing && existing.shadeId === shade.id && existing.coverage === 1) {
          return prev;
        }
        return {
          ...prev,
          [zone]: {
            shadeId: shade.id,
            hex: shade.hex,
            secondaryHex: shade.secondaryHex,
            finish: shade.finish,
            opacity: existing?.opacity ?? product.defaultOpacity,
            coverage: 1,
            style: existing?.style ?? defaultStyle,
          },
        };
      });
    },
    [loadedShades, unlockedTools]
  );

  const handleUpdateOpacity = (zone: MakeupZoneId, opacity: number) => {
    const defaultStyle: MakeupStyle = unlockedTools.has('style_classic') ? 'classic' : 'natural';
    setMakeup((prev) => {
      const existing = prev[zone];
      if (!existing) {
        const shade = loadedShades[zone];
        return {
          ...prev,
          [zone]: {
            shadeId: shade.id,
            hex: shade.hex,
            secondaryHex: shade.secondaryHex,
            finish: shade.finish,
            opacity,
            coverage: 0,
            style: defaultStyle,
          },
        };
      }
      return { ...prev, [zone]: { ...existing, opacity } };
    });
  };

  const handleUpdateStyle = (zone: MakeupZoneId, style: MakeupStyle) => {
    const shade = loadedShades[zone];
    const product = MAKEUP_PRODUCTS.find((p) => p.zone === zone);
    setMakeup((prev) => {
      const existing = prev[zone];
      if (!existing && shade && product) {
        return {
          ...prev,
          [zone]: {
            shadeId: shade.id,
            hex: shade.hex,
            secondaryHex: shade.secondaryHex,
            finish: shade.finish,
            opacity: product.defaultOpacity,
            coverage: 0,
            style,
          },
        };
      }
      if (!existing) return prev;
      return { ...prev, [zone]: { ...existing, style } };
    });
  };

  const handleClearZone = (zone: MakeupZoneId) => {
    setMakeup((prev) => {
      const next = { ...prev };
      delete next[zone];
      return next;
    });
    setClearZoneSignal((prev) => ({ zone, seq: (prev?.seq ?? 0) + 1 }));
  };

  const handleResetAll = () => {
    setMakeup({});
    setActiveFigureId(null);
    setClearAllSignal((c) => c + 1);
  };

  const handleMarkSolved = (problemId: string, correct: boolean, topic: OstTopic) => {
    const topicIdx = OST_TOPICS.indexOf(topic);
    const topicKey = `t${topicIdx >= 0 ? topicIdx : 0}`;
    const todayKey = getTodayKey();

    const prevTopic = topicStats[topicKey] || { correct: 0, incorrect: 0 };
    const nextTopicStats: TopicStatsMap = {
      ...topicStats,
      [topicKey]: {
        correct: prevTopic.correct + (correct ? 1 : 0),
        incorrect: prevTopic.incorrect + (correct ? 0 : 1),
      },
    };

    const prevDay = dailyStats[todayKey] || { correct: 0, incorrect: 0 };
    const nextDailyStats: DailyStatsMap = trimDailyStats({
      ...dailyStats,
      [todayKey]: {
        correct: prevDay.correct + (correct ? 1 : 0),
        incorrect: prevDay.incorrect + (correct ? 0 : 1),
      },
    });

    setTopicStats(nextTopicStats);
    setDailyStats(nextDailyStats);

    if (correct) {
      playTone('correct', muted);
      const isNewSolve = !solvedIds.has(problemId);
      const nextStreak = streak + 1;
      const nextTotal = totalQuestionsSolved + 1;
      const nextStars = isNewSolve ? glamStars + 1 : glamStars;
      const nextSolved = new Set(solvedIds);
      nextSolved.add(problemId);

      setStreak(nextStreak);
      setTotalQuestionsSolved(nextTotal);
      setGlamStars(nextStars);
      setSolvedIds(nextSolved);
      setQuizNotice(
        isNewSolve
          ? null
          : 'Already mastered! Solve an unsolved problem to earn another Glam Star.'
      );

      if (user) {
        void persistProgress(user, {
          glamStars: nextStars,
          totalQuestionsSolved: nextTotal,
          totalIncorrect,
          streak: nextStreak,
          solvedIds: Array.from(nextSolved),
          unlockedShades: Array.from(unlockedShades),
          unlockedTools: Array.from(unlockedTools),
          topicStats: nextTopicStats,
          dailyStats: nextDailyStats,
        });
      }
    } else {
      playTone('wrong', muted);
      const nextIncorrect = totalIncorrect + 1;
      setStreak(0);
      setTotalIncorrect(nextIncorrect);
      if (user) {
        void persistProgress(user, {
          glamStars,
          totalQuestionsSolved,
          totalIncorrect: nextIncorrect,
          streak: 0,
          solvedIds: Array.from(solvedIds),
          unlockedShades: Array.from(unlockedShades),
          unlockedTools: Array.from(unlockedTools),
          topicStats: nextTopicStats,
          dailyStats: nextDailyStats,
        });
      }
    }
  };

  const handleOpenSaveModal = () => {
    const existing = savedFigures.find((f) => f.id === activeFigureId);
    setLookTitleInput(
      existing ? existing.title : `${selectedModel.name} — Studio Look`
    );
    setSaveFeedback(null);
    setSaveModalOpen(true);
  };

  const handleSaveFigure = async (saveAsNew: boolean) => {
    if (!user || !canvasRef.current) return;
    setSavingLook(true);
    setSaveFeedback(null);

    try {
      await ensureUserProgressDoc(user);
      const { thumbnailDataUrl, zoneMasks } = canvasRef.current.exportFigureSnapshot();
      const targetId =
        !saveAsNew && activeFigureId ? activeFigureId : `look_${Date.now()}`;
      const figPath = `users/${user.uid}/figures/${targetId}`;
      const figDocRef = doc(db, 'users', user.uid, 'figures', targetId);

      const cleanMakeup: AppliedMakeupState = {};
      (Object.keys(makeup) as MakeupZoneId[]).slice(0, 15).forEach((z) => {
        const layer = makeup[z];
        if (!layer) return;
        cleanMakeup[z] = {
          shadeId: layer.shadeId,
          hex: layer.hex,
          ...(layer.secondaryHex ? { secondaryHex: layer.secondaryHex } : {}),
          finish: layer.finish,
          opacity: layer.opacity,
          coverage: layer.coverage,
          ...(layer.style ? { style: layer.style } : {}),
        };
      });

      const boundedMasks: Record<string, string> = {};
      Object.entries(zoneMasks)
        .slice(0, 15)
        .forEach(([k, v]) => {
          boundedMasks[k] = v;
        });

      const payload = {
        ownerId: user.uid,
        title: sanitizeTitle(lookTitleInput),
        modelId: selectedModel.id,
        thumbnailDataUrl: thumbnailDataUrl.slice(0, 120000),
        makeupState: cleanMakeup,
        zoneMasks: boundedMasks,
        updatedAt: serverTimestamp(),
      };

      if (!saveAsNew && activeFigureId) {
        try {
          await updateDoc(figDocRef, {
            title: payload.title,
            modelId: payload.modelId,
            thumbnailDataUrl: payload.thumbnailDataUrl,
            makeupState: payload.makeupState,
            zoneMasks: payload.zoneMasks,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, figPath);
        }
      } else {
        try {
          await setDoc(figDocRef, {
            ...payload,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, figPath);
        }
      }

      setActiveFigureId(targetId);
      setSaveFeedback('Saved to your Google account!');
      setTimeout(() => {
        setSaveModalOpen(false);
        setSaveFeedback(null);
      }, 650);
    } finally {
      setSavingLook(false);
    }
  };

  const handleLoadSavedFigure = (fig: SavedFigureRecord) => {
    const model = MODELS.find((m) => m.id === fig.modelId) || MODELS[2];
    setSelectedModel(model);
    setMakeup(fig.makeupState || {});
    setActiveFigureId(fig.id);
    setActiveTab('studio');
    setTimeout(() => {
      void canvasRef.current?.loadSavedMasks(fig.zoneMasks || {});
    }, 60);
  };

  const handleDeleteSavedFigure = async (figureId: string) => {
    if (!user) return;
    const figPath = `users/${user.uid}/figures/${figureId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'figures', figureId));
      if (activeFigureId === figureId) {
        setActiveFigureId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, figPath);
    }
  };

  const activeShadeHex = useMemo(
    () => loadedShades[activeZone]?.hex || '#E88A94',
    [loadedShades, activeZone]
  );

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1917] flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E7E1DA] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className="font-display text-xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Glam &amp; Graph
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="flex items-center gap-4 sm:gap-7 text-sm font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'studio'
                  ? 'text-[#9D174D] border-b-2 border-[#9D174D]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Makeup Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'saved'
                  ? 'text-[#9D174D] border-b-2 border-[#9D174D]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Saved Looks ({savedFigures.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'guide'
                  ? 'text-[#9D174D] border-b-2 border-[#9D174D]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Makeup Guide
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('topics')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'topics'
                  ? 'text-[#9D174D] border-b-2 border-[#9D174D]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              OST Topics (300)
            </button>
          </nav>

          {/* Zone 3: Google Sign-In / Signed-In Account Action */}
          <div className="flex items-center shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs font-medium text-[#44403C] whitespace-nowrap">
                  {user.displayName?.split(' ')[0] || 'Student'}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CFC7] bg-white px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-6 py-5 space-y-5">
        {authError && (
          <div className="flex items-center justify-between rounded-lg border border-[#B45309]/35 bg-[#B45309]/10 px-4 py-2.5 text-xs text-[#78350F]">
            <span>Google Sign-In note: {authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'studio' && (
          <>
            {/* Workspace Status Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1DA] pb-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] tabular-nums">
                <span className="font-semibold text-[#1C1917]">Algebra 1 OST Review</span>
                <span aria-hidden="true">·</span>
                <span>
                  Mastered: {solvedIds.size} / {ALL_PROBLEMS.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#047857]">
                  Correct: {totalQuestionsSolved}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#B45309]">
                  Incorrect: {totalIncorrect}
                </span>
                <span aria-hidden="true">·</span>
                <span>Streak: {streak}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#9D174D]">
                  <Star className="h-3.5 w-3.5 fill-[#9D174D] text-[#9D174D]" />
                  <span>Glam Stars: {glamStars}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    quizSectionRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="rounded-lg border border-[#9D174D]/35 bg-[#9D174D]/5 px-2.5 py-1 text-xs font-semibold text-[#9D174D] hover:bg-[#9D174D]/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Jump to OST Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CFC7] bg-white px-2.5 py-1 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{muted ? 'Sound Off' : 'Sound On'}</span>
                </button>
              </div>
            </div>

            {/* Two-Column Interactive Studio + OST Quiz */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Realistic Model Mirror (Cursor Painting Canvas) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20">
                <RealisticModelCanvas
                  ref={canvasRef}
                  model={selectedModel}
                  makeup={makeup}
                  activeZone={activeZone}
                  activeShadeHex={activeShadeHex}
                  brushSize={brushSize}
                  toolMode={toolMode}
                  showGuide={showGuide}
                  onToggleGuide={() => setShowGuide((g) => !g)}
                  onStrokeApplied={handleStrokeApplied}
                  onClearZone={handleClearZone}
                  onSaveLookClick={handleOpenSaveModal}
                  clearAllSignal={clearAllSignal}
                  clearZoneSignal={clearZoneSignal}
                />
              </div>

              {/* Right Column: Vanity Makeup Kit + 300-Problem OST Challenge */}
              <div className="lg:col-span-7 space-y-6">
                <MakeupStudioPanel
                  selectedModel={selectedModel}
                  onSelectModel={handleSelectModel}
                  activeZone={activeZone}
                  onSelectZone={setActiveZone}
                  loadedShades={loadedShades}
                  makeup={makeup}
                  unlockedShades={unlockedShades}
                  unlockedTools={unlockedTools}
                  glamStars={glamStars}
                  brushSize={brushSize}
                  onChangeBrushSize={setBrushSize}
                  toolMode={toolMode}
                  onChangeToolMode={setToolMode}
                  onLoadShade={handleLoadShade}
                  onUnlockAndLoadShade={handleUnlockAndLoadShade}
                  onUnlockTool={handleUnlockTool}
                  onUpdateOpacity={handleUpdateOpacity}
                  onUpdateStyle={handleUpdateStyle}
                  onResetAll={handleResetAll}
                  onPromptSolveForMore={(message) => {
                    setQuizNotice(
                      message ||
                        'Solve the Algebra 1 OST problem below to earn Glam Stars and unlock more brushes and unique colors!'
                    );
                    quizSectionRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    });
                  }}
                />

                <div ref={quizSectionRef}>
                  <QuizPanel
                    problems={ALL_PROBLEMS}
                    selectedTopic={selectedTopic}
                    onSelectTopic={setSelectedTopic}
                    solvedIds={solvedIds}
                    onMarkSolved={handleMarkSolved}
                    highlightNotice={quizNotice}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <SavedFiguresView
            user={user}
            authLoading={authLoading}
            savedFigures={savedFigures}
            onSignIn={handleGoogleSignIn}
            onLoadFigure={handleLoadSavedFigure}
            onDeleteFigure={handleDeleteSavedFigure}
            onGoToStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'guide' && (
          <MakeupGuideView
            onJumpToZone={(zone) => {
              const toolId = getZoneUnlockToolId(zone);
              const isOpen = !toolId || unlockedTools.has(toolId);
              setActiveTab('studio');
              if (isOpen) {
                setActiveZone(zone);
              } else {
                const info = getToolInfo(toolId);
                setQuizNotice(
                  `${info.label} requires ${info.cost} Glam Star${
                    info.cost > 1 ? 's' : ''
                  }. Solve OST questions below or click ${info.label} in the kit to unlock it!`
                );
              }
            }}
          />
        )}

        {activeTab === 'topics' && (
          <TopicsOverviewView
            problemsByTopic={PROBLEMS_BY_TOPIC}
            solvedIds={solvedIds}
            totalCorrect={totalQuestionsSolved}
            totalIncorrect={totalIncorrect}
            topicStats={topicStats}
            dailyStats={dailyStats}
            onPracticeTopic={(topic) => {
              setSelectedTopic(topic);
              setActiveTab('studio');
              setTimeout(() => {
                quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            }}
          />
        )}
      </main>

      {/* Save Look Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-look-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E7E1DA] bg-white p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 id="save-look-title" className="font-display text-lg font-semibold text-[#1C1917]">
                Save Model Look
              </h2>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                aria-label="Close save dialog"
                className="rounded-lg p-1 text-[#57534E] hover:bg-[#F3EFEA] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!user ? (
              <div className="space-y-4">
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Sign in with Google to save <strong className="text-[#1C1917]">{selectedModel.name}</strong>’s
                  painted makeup figure to your gallery so you can open and edit it anytime.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveModalOpen(false)}
                    className="rounded-lg border border-[#D6CFC7] bg-white px-3.5 py-2 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="look-title-input"
                    className="block text-xs font-semibold text-[#1C1917] mb-1.5"
                  >
                    Look Name
                  </label>
                  <input
                    id="look-title-input"
                    type="text"
                    maxLength={80}
                    value={lookTitleInput}
                    onChange={(e) => setLookTitleInput(e.target.value)}
                    placeholder="e.g. Maya — Emerald Glam"
                    className="w-full rounded-lg border border-[#D6CFC7] bg-white px-3 py-2 text-sm text-[#1C1917] focus:border-[#9D174D] focus:outline-none"
                  />
                </div>

                {saveFeedback && (
                  <p className="text-xs font-semibold text-[#047857]">{saveFeedback}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveModalOpen(false)}
                    className="rounded-lg border border-[#D6CFC7] bg-white px-3.5 py-2 text-xs font-medium text-[#44403C] hover:bg-[#F3EFEA] cursor-pointer"
                  >
                    Cancel
                  </button>
                  {activeFigureId && (
                    <button
                      type="button"
                      disabled={savingLook}
                      onClick={() => void handleSaveFigure(true)}
                      className="rounded-lg border border-[#9D174D] bg-white px-3.5 py-2 text-xs font-semibold text-[#9D174D] hover:bg-[#9D174D]/5 cursor-pointer disabled:opacity-60"
                    >
                      Save as New Look
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={savingLook}
                    onClick={() => void handleSaveFigure(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] cursor-pointer disabled:opacity-60"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span>
                      {savingLook
                        ? 'Saving...'
                        : activeFigureId
                        ? 'Update Saved Look'
                        : 'Save to Gallery'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
