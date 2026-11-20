import { MathProblem, OST_TOPICS, OstTopic } from '../../types';
import { TOPIC_01_LAZY_WAY } from './topic01_lazyWay';
import { TOPIC_02_DATA_ANALYSIS } from './topic02_dataAnalysis';
import { TOPIC_03_POLYNOMIALS } from './topic03_polynomials';
import { TOPIC_04_FUNCTIONS } from './topic04_functions';
import { TOPIC_05_QUADRATICS } from './topic05_quadratics';
import { TOPIC_06_EXPONENTIAL } from './topic06_exponential';
import { TOPIC_07_LINEAR1 } from './topic07_linear1';
import { TOPIC_08_LINEAR2 } from './topic08_linear2';
import { TOPIC_09_SYSTEMS } from './topic09_systems';
import { TOPIC_10_EXPRESSIONS } from './topic10_expressions';

export const ALL_PROBLEMS: MathProblem[] = [
  ...TOPIC_01_LAZY_WAY,
  ...TOPIC_02_DATA_ANALYSIS,
  ...TOPIC_03_POLYNOMIALS,
  ...TOPIC_04_FUNCTIONS,
  ...TOPIC_05_QUADRATICS,
  ...TOPIC_06_EXPONENTIAL,
  ...TOPIC_07_LINEAR1,
  ...TOPIC_08_LINEAR2,
  ...TOPIC_09_SYSTEMS,
  ...TOPIC_10_EXPRESSIONS,
];

export const PROBLEMS_BY_TOPIC: Record<OstTopic, MathProblem[]> = {
  [OST_TOPICS[0]]: TOPIC_01_LAZY_WAY,
  [OST_TOPICS[1]]: TOPIC_02_DATA_ANALYSIS,
  [OST_TOPICS[2]]: TOPIC_03_POLYNOMIALS,
  [OST_TOPICS[3]]: TOPIC_04_FUNCTIONS,
  [OST_TOPICS[4]]: TOPIC_05_QUADRATICS,
  [OST_TOPICS[5]]: TOPIC_06_EXPONENTIAL,
  [OST_TOPICS[6]]: TOPIC_07_LINEAR1,
  [OST_TOPICS[7]]: TOPIC_08_LINEAR2,
  [OST_TOPICS[8]]: TOPIC_09_SYSTEMS,
  [OST_TOPICS[9]]: TOPIC_10_EXPRESSIONS,
};
