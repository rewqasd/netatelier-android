import type {Project,DerivedProject,TopologyGraph} from '../domain/model';
export function buildTopology(_project:Project,derived:DerivedProject):TopologyGraph{return structuredClone(derived.topology)}
