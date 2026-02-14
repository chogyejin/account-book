import clsx from "clsx";
import styles from "./CategoryTag.module.css";

interface CategoryTagProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  className?: string;
}

export default function CategoryTag({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}: CategoryTagProps) {
  return (
    <div className={clsx(styles.categoryList, className)}>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          className={clsx(
            styles.categoryTag,
            selectedCategory === cat && styles.selected,
          )}
          onClick={() => onSelectCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
