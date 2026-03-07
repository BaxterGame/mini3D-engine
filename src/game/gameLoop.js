// mini-engine v0.1g — game loop extrait
// Boucle requestAnimationFrame + delta clock.
// Refactor-only: n'altère pas le comportement, juste isole la boucle.

export function createGameLoop({ clock, tick }) {
  let animationId = null;

  function frame() {
    const delta = Math.min(0.033, clock.getDelta());
    animationId = requestAnimationFrame(frame);
    tick(delta);
  }

  return {
    start() {
      if (animationId !== null) return;
      frame();
    },
    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    getId() {
      return animationId;
    },
  };
}
