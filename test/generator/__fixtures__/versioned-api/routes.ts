import { route } from '@alien-rpc/service'

export const funFact = route('/fun-fact').get(() => {
  const funFacts = [
    "Bananas are berries, but strawberries aren't!",
    "A group of flamingos is called a 'flamboyance'.",
    'The shortest war in history lasted 38 minutes.',
    'Cows have best friends and get stressed when separated.',
    'The Hawaiian pizza was invented in Canada.',
  ]
  return funFacts[Math.floor(Math.random() * funFacts.length)]
})
