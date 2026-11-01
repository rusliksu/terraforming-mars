/**
 * Build/rules identity for the first authorized v2 gateway increment.
 *
 * The client echoes this value in ActionRequestV1.engineVersion; a mismatch is
 * rejected with ENGINE_VERSION_MISMATCH before any journal write.
 */
export const ACTION_GATEWAY_ENGINE_VERSION = 'a4-candidate-1';
