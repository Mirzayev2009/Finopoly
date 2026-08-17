import { DiceFive, DiceFour, DiceOne, DiceSix, DiceThree, DiceTwo } from '@phosphor-icons/react';
import styles from './Dice.module.css';

const DICE_ICONS = [DiceOne, DiceTwo, DiceThree, DiceFour, DiceFive, DiceSix];

export default function Dice({ state }) {
  const dice = state.turn.dice;

  if (!dice) {
    return (
      <div className={styles.dice}>
        <span className={styles.placeholder}>No roll yet</span>
      </div>
    );
  }

  const [d1, d2] = dice;
  const isDouble = d1 === d2;
  const Face1 = DICE_ICONS[d1 - 1];
  const Face2 = DICE_ICONS[d2 - 1];

  return (
    <div className={styles.dice}>
      <span className={styles.faces} aria-label={`Rolled ${d1} and ${d2}`}>
        {Face1 ? <Face1 size={28} weight="fill" /> : null}
        {Face2 ? <Face2 size={28} weight="fill" /> : null}
      </span>
      {isDouble ? <span className={styles.doubles}>Doubles!</span> : null}
    </div>
  );
}
