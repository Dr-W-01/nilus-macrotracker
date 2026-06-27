import type { BadgeDefinition, BadgeId } from '@/lib/badges/types'

const b = (
  def: BadgeDefinition,
): BadgeDefinition => def

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // —— One-Time ——
  b({ id: 'first_food', category: 'one_time', name: 'First Bite', description: 'You started your tracking journey.', howToEarn: 'Log your first food on the Daily tab.', icon: '🍽️', recurring: false }),
  b({ id: 'library_five', category: 'one_time', name: 'Starter Pantry', description: 'Five foods in your library.', howToEarn: 'Add 5 foods to your Library.', icon: '🥫', recurring: false }),
  b({ id: 'library_ten', category: 'one_time', name: 'Pantry Builder', description: 'Your food library is growing.', howToEarn: 'Add 10 foods to your Library.', icon: '📚', recurring: false }),
  b({ id: 'library_twentyfive', category: 'one_time', name: 'Shelf Stacker', description: 'A well-stocked personal food database.', howToEarn: 'Add 25 foods to your Library.', icon: '🗄️', recurring: false }),
  b({ id: 'library_fifty', category: 'one_time', name: 'Pantry Pro', description: 'Your library is seriously comprehensive.', howToEarn: 'Add 50 foods to your Library.', icon: '🏪', recurring: false }),
  b({ id: 'library_hundred', category: 'one_time', name: 'Food Encyclopedia', description: 'One hundred library foods — incredible.', howToEarn: 'Add 100 foods to your Library.', icon: '📖', recurring: false }),
  b({ id: 'first_recipe', category: 'one_time', name: 'Recipe Creator', description: 'You built a reusable meal from ingredients.', howToEarn: 'Create your first recipe in the Library.', icon: '🍱', recurring: false }),
  b({ id: 'recipes_five', category: 'one_time', name: 'Recipe Rack', description: 'Five recipes ready to go.', howToEarn: 'Create 5 recipes in your Library.', icon: '🧑‍🍳', recurring: false }),
  b({ id: 'recipe_logged', category: 'one_time', name: 'Recipe Meal', description: 'You logged a recipe to your daily log.', howToEarn: 'Add a recipe from your library to the Daily tab.', icon: '🥙', recurring: false }),
  b({ id: 'note_writer', category: 'one_time', name: 'Day Diarist', description: 'You left yourself a note for the day.', howToEarn: 'Write a daily note on the Daily tab.', icon: '📝', recurring: false }),
  b({ id: 'note_long', category: 'one_time', name: 'Detailed Diarist', description: 'A thoughtful, detailed daily note.', howToEarn: 'Write a daily note with at least 100 characters.', icon: '📜', recurring: false }),
  b({ id: 'first_uncategorized', category: 'one_time', name: 'Free Spirit', description: 'Logged food without a meal category.', howToEarn: 'Log a food without assigning it to a meal.', icon: '🦋', recurring: false }),
  b({ id: 'weight_logs_10', category: 'one_time', name: 'Scale Regular', description: 'Ten days of weight logged.', howToEarn: 'Log your weight on 10 different days.', icon: '🔢', recurring: false, weightBased: true }),
  b({ id: 'weight_logs_50', category: 'one_time', name: 'Scale Veteran', description: 'Fifty weight entries over time.', howToEarn: 'Log your weight on 50 different days.', icon: '🏋️', recurring: false, weightBased: true }),
  b({ id: 'burn_month_days', category: 'one_time', name: 'Burn Veteran', description: 'Twenty days of tracking calories burned.', howToEarn: 'Log burned calories on 20 different days.', icon: '♨️', recurring: false, burnBased: true }),
  b({ id: 'logs_50', category: 'one_time', name: 'Fifty Entries', description: 'Fifty foods logged — nice momentum.', howToEarn: 'Log 50 total food entries across all days.', icon: '5️⃣', recurring: false }),
  b({ id: 'logs_250', category: 'one_time', name: 'Quarter Thousand', description: 'Two hundred fifty logged entries.', howToEarn: 'Log 250 total food entries across all days.', icon: '🎲', recurring: false }),
  b({ id: 'logs_500', category: 'one_time', name: 'High Volume', description: 'Five hundred entries — elite consistency.', howToEarn: 'Log 500 total food entries across all days.', icon: '🚀', recurring: false }),
  b({ id: 'logs_1000', category: 'one_time', name: 'Thousand Club', description: 'One thousand logged entries. Legendary.', howToEarn: 'Log 1,000 total food entries across all days.', icon: '👑', recurring: false }),
  b({ id: 'logs_2000', category: 'one_time', name: 'Double Thousand', description: 'Two thousand food entries logged.', howToEarn: 'Log 2,000 total food entries across all days.', icon: '💎', recurring: false }),
  b({ id: 'logs_5000', category: 'one_time', name: 'Macro Legend', description: 'Five thousand entries. Hall of fame.', howToEarn: 'Log 5,000 total food entries across all days.', icon: '🏛️', recurring: false }),
  b({ id: 'days_logged_10', category: 'one_time', name: 'Regular Tracker', description: 'Ten different days with logs.', howToEarn: 'Log food on 10 different calendar days.', icon: '📆', recurring: false }),
  b({ id: 'days_logged_50', category: 'one_time', name: 'Steady Habits', description: 'Fifty days of showing up.', howToEarn: 'Log food on 50 different calendar days.', icon: '🎖️', recurring: false }),
  b({ id: 'days_logged_100', category: 'one_time', name: 'Lifetime Logger', description: 'One hundred days logged over time.', howToEarn: 'Log food on 100 different calendar days.', icon: '🌟', recurring: false }),
  b({ id: 'days_logged_200', category: 'one_time', name: 'Double Century', description: 'Two hundred distinct logging days.', howToEarn: 'Log food on 200 different calendar days.', icon: '🎗️', recurring: false }),
  b({ id: 'days_logged_365', category: 'one_time', name: 'Year of Logging', description: 'A full year of distinct logged days.', howToEarn: 'Log food on 365 different calendar days.', icon: '🗓️', recurring: false }),
  b({ id: 'days_logged_500', category: 'one_time', name: 'Five Hundred Days', description: 'Five hundred distinct days of food logging.', howToEarn: 'Log food on 500 different calendar days.', icon: '🏅', recurring: false }),
  b({ id: 'recipes_ten', category: 'one_time', name: 'Recipe Library', description: 'Ten recipes in your collection.', howToEarn: 'Create 10 recipes in your Library.', icon: '📋', recurring: false }),
  b({ id: 'burn_logs_50', category: 'one_time', name: 'Burn Historian', description: 'Fifty days of burned calorie tracking.', howToEarn: 'Log burned calories on 50 different days.', icon: '📆', recurring: false, burnBased: true }),
  b({ id: 'burn_month_calendar', category: 'one_time', name: 'Burn Month', description: 'Twenty burn entries in a single month.', howToEarn: 'Log burned calories on 20+ days in one calendar month.', icon: '🗓️', recurring: false, burnBased: true }),

  // —— Macro Tracking ——
  b({ id: 'protein_day', category: 'macro', name: 'Protein Hit', description: 'Protein goal crushed for the day.', howToEarn: 'Hit your protein goal on a logged day.', icon: '🥩', recurring: true }),
  b({ id: 'calorie_day', category: 'macro', name: 'On Target', description: 'Calories right where you aimed.', howToEarn: 'Hit your calorie goal on a logged day.', icon: '🎯', recurring: true }),
  b({ id: 'balance_day', category: 'macro', name: 'Balanced Energy', description: 'Net calories matched your energy goal.', howToEarn: 'Hit your energy balance goal on a logged day.', icon: '⚡', recurring: true }),
  b({ id: 'fiber_day', category: 'macro', name: 'Fiber Focus', description: 'Fiber goal met for the day.', howToEarn: 'Hit your fiber goal on a logged day.', icon: '🥦', recurring: true }),
  b({ id: 'carbs_day', category: 'macro', name: 'Carb Control', description: 'Carbs on target for the day.', howToEarn: 'Hit your carbs goal on a logged day.', icon: '🍞', recurring: true }),
  b({ id: 'fat_day', category: 'macro', name: 'Fat Focus', description: 'Fat goal met for the day.', howToEarn: 'Hit your fat goal on a logged day.', icon: '🥑', recurring: true }),
  b({ id: 'sugars_day', category: 'macro', name: 'Sugar Savvy', description: 'Sugars goal met for the day.', howToEarn: 'Hit your sugars goal on a logged day.', icon: '🍬', recurring: true }),
  b({ id: 'deficit_day', category: 'macro', name: 'Deficit Day', description: 'Net calories hit your deficit target.', howToEarn: 'Hit your deficit energy balance goal on a logged day.', icon: '📉', recurring: true }),
  b({ id: 'surplus_day', category: 'macro', name: 'Surplus Day', description: 'Net calories hit your surplus target.', howToEarn: 'Hit your surplus energy balance goal on a logged day.', icon: '📈', recurring: true }),
  b({ id: 'macro_triple_day', category: 'macro', name: 'Macro Trio', description: 'Protein, calories, and fiber all on target.', howToEarn: 'Hit protein, calorie, and fiber goals on the same day.', icon: '🎪', recurring: true }),
  b({ id: 'macro_quad_day', category: 'macro', name: 'Macro Quartet', description: 'Protein, calories, carbs, and fat all on target.', howToEarn: 'Hit protein, calorie, carbs, and fat goals on the same day.', icon: '🎭', recurring: true }),
  b({ id: 'protein_week', category: 'macro', name: 'Protein Pro', description: 'Protein targets nailed all week.', howToEarn: 'Hit protein on every logged day in a week (5+ logged days).', icon: '💎', recurring: true }),
  b({ id: 'calorie_week', category: 'macro', name: 'Calorie Commander', description: 'Calorie targets met all week.', howToEarn: 'Hit calories on every logged day in a week (5+ logged days).', icon: '📊', recurring: true }),
  b({ id: 'balance_week', category: 'macro', name: 'Energy Expert', description: 'Energy balance on target all week.', howToEarn: 'Hit energy balance on every logged day in a week (5+ logged days).', icon: '🔋', recurring: true }),
  b({ id: 'fiber_week', category: 'macro', name: 'Fiber Fanatic', description: 'Fiber goals met all week.', howToEarn: 'Hit fiber on every logged day in a week (5+ logged days).', icon: '🌿', recurring: true }),
  b({ id: 'carbs_week', category: 'macro', name: 'Carb Commander', description: 'Carbs on target all week.', howToEarn: 'Hit carbs on every logged day in a week (5+ logged days).', icon: '🌾', recurring: true }),
  b({ id: 'fat_week', category: 'macro', name: 'Fat Finisher', description: 'Fat goals met all week.', howToEarn: 'Hit fat on every logged day in a week (5+ logged days).', icon: '🫒', recurring: true }),
  b({ id: 'sugars_week', category: 'macro', name: 'Sugar Steward', description: 'Sugars on target all week.', howToEarn: 'Hit sugars on every logged day in a week (5+ logged days).', icon: '🍯', recurring: true }),
  b({ id: 'protein_streak_7', category: 'macro', name: 'Protein Streak', description: 'Seven days of hitting protein.', howToEarn: 'Hit your protein goal on 7 consecutive logged days.', icon: '💪', recurring: true }),
  b({ id: 'calorie_streak_7', category: 'macro', name: 'Calorie Streak', description: 'Seven days of hitting calories.', howToEarn: 'Hit your calorie goal on 7 consecutive logged days.', icon: '🔥', recurring: true }),
  b({ id: 'fiber_streak_7', category: 'macro', name: 'Fiber Streak', description: 'Seven days of hitting fiber.', howToEarn: 'Hit your fiber goal on 7 consecutive logged days.', icon: '🌱', recurring: true }),
  b({ id: 'deficit_streak_3', category: 'macro', name: 'Deficit Run', description: 'Three days in a row on deficit target.', howToEarn: 'Hit your deficit energy balance goal on 3 consecutive logged days.', icon: '📉', recurring: true }),
  b({ id: 'deficit_streak_7', category: 'macro', name: 'Deficit Streak', description: 'A full week on deficit target.', howToEarn: 'Hit your deficit energy balance goal on 7 consecutive logged days.', icon: '⬇️', recurring: true }),

  // —— Weight ——
  b({ id: 'first_weight', category: 'weight', name: 'Scale Starter', description: 'Your first weight entry is in the books.', howToEarn: 'Log your body weight on the Daily tab.', icon: '⚖️', recurring: false, weightBased: true }),
  b({ id: 'weight_streak_7', category: 'weight', name: 'Weight Watcher', description: 'A week of weight check-ins.', howToEarn: 'Log your weight on 7 consecutive days.', icon: '📉', recurring: true, weightBased: true }),
  b({ id: 'weight_streak_14', category: 'weight', name: 'Fortnight Scale', description: 'Two weeks of daily weigh-ins.', howToEarn: 'Log your weight on 14 consecutive days.', icon: '📊', recurring: true, weightBased: true }),
  b({ id: 'weight_streak_30', category: 'weight', name: 'Scale Streak', description: 'A month of consistent weigh-ins.', howToEarn: 'Log your weight on 30 consecutive days.', icon: '📈', recurring: true, weightBased: true }),
  b({ id: 'weight_streak_60', category: 'weight', name: 'Scale Master', description: 'Sixty days of weight logging.', howToEarn: 'Log your weight on 60 consecutive days.', icon: '🏅', recurring: true, weightBased: true }),
  b({ id: 'weight_streak_90', category: 'weight', name: 'Quarter-Year Scale', description: 'Ninety days of daily weigh-ins.', howToEarn: 'Log your weight on 90 consecutive days.', icon: '🎯', recurring: true, weightBased: true }),

  // —— Net Energy & Burn Logging ——
  b({ id: 'burn_tracker', category: 'burned', name: 'Burn Tracker', description: 'You logged calories burned.', howToEarn: 'Record burned calories for a day.', icon: '🔥', recurring: false, burnBased: true }),
  b({ id: 'burn_week', category: 'burned', name: 'Burn Week', description: 'Burned calories tracked all week.', howToEarn: 'Log burned calories on at least 5 days in a calendar week.', icon: '🌡️', recurring: true, burnBased: true }),
  b({ id: 'burn_streak_7', category: 'burned', name: 'Burn Streak', description: 'Seven days of burn tracking.', howToEarn: 'Log burned calories on 7 consecutive days.', icon: '☀️', recurring: true, burnBased: true }),
  b({ id: 'burn_streak_14', category: 'burned', name: 'Burn Fortnight', description: 'Two weeks of burn logging.', howToEarn: 'Log burned calories on 14 consecutive days.', icon: '🌋', recurring: true, burnBased: true }),
  b({ id: 'burn_streak_30', category: 'burned', name: 'Burn Machine', description: 'A month of tracking burns.', howToEarn: 'Log burned calories on 30 consecutive days.', icon: '💨', recurring: true, burnBased: true }),
  b({ id: 'net_deficit_500_day', category: 'burned', name: 'Deep Deficit', description: 'A 500+ calorie net deficit in one day.', howToEarn: 'End a logged day with net calories at least 500 below zero (eaten minus burned).', icon: '📉', recurring: true, burnBased: true }),
  b({ id: 'net_deficit_1000_day', category: 'burned', name: 'Major Deficit', description: 'A 1,000+ calorie net deficit in one day.', howToEarn: 'End a logged day with net calories at least 1,000 below zero (eaten minus burned).', icon: '⬇️', recurring: true, burnBased: true }),
  b({ id: 'net_deficit_week_5000', category: 'burned', name: 'Deficit Week', description: '5,000+ total net deficit across a week.', howToEarn: 'Accumulate 5,000+ net calories of deficit across a calendar week (requires burned calorie logging).', icon: '📊', recurring: true, burnBased: true }),

  // —— Streaks & Consistency ——
  b({ id: 'streak_3', category: 'streak', name: 'Spark Starter', description: 'Three days in a row — momentum building.', howToEarn: 'Log food on 3 consecutive days.', icon: '✨', recurring: true }),
  b({ id: 'streak_7', category: 'streak', name: 'Week Warrior', description: 'Seven days of consistent logging.', howToEarn: 'Log food on 7 consecutive days.', icon: '🔥', recurring: true }),
  b({ id: 'streak_14', category: 'streak', name: 'Fortnight Focus', description: 'Two full weeks without missing a day.', howToEarn: 'Log food on 14 consecutive days.', icon: '📅', recurring: true }),
  b({ id: 'streak_21', category: 'streak', name: 'Three-Week Titan', description: 'Twenty-one days of daily logging.', howToEarn: 'Log food on 21 consecutive days.', icon: '🌙', recurring: true }),
  b({ id: 'streak_30', category: 'streak', name: 'Monthly Machine', description: 'A full month of daily tracking.', howToEarn: 'Log food on 30 consecutive days.', icon: '💪', recurring: true }),
  b({ id: 'streak_45', category: 'streak', name: 'Forty-Five Fighter', description: 'Forty-five days without a miss.', howToEarn: 'Log food on 45 consecutive days.', icon: '⚔️', recurring: true }),
  b({ id: 'streak_60', category: 'streak', name: 'Iron Logger', description: 'Sixty days straight — serious dedication.', howToEarn: 'Log food on 60 consecutive days.', icon: '🦾', recurring: true }),
  b({ id: 'streak_90', category: 'streak', name: 'Quarter-Year Logger', description: 'Ninety consecutive days of tracking.', howToEarn: 'Log food on 90 consecutive days.', icon: '🌟', recurring: true }),
  b({ id: 'streak_100', category: 'streak', name: 'Centennial Streak', description: 'One hundred consecutive days logged.', howToEarn: 'Log food on 100 consecutive days.', icon: '🏆', recurring: true }),
  b({ id: 'streak_200', category: 'streak', name: 'Double Century Streak', description: 'Two hundred days in a row.', howToEarn: 'Log food on 200 consecutive days.', icon: '🌠', recurring: true }),
  b({ id: 'streak_365', category: 'streak', name: 'Year Streak', description: 'A full year of consecutive logging.', howToEarn: 'Log food on 365 consecutive days.', icon: '🎆', recurring: true }),
  b({ id: 'breakfast_streak_7', category: 'streak', name: 'Breakfast Boss', description: 'A week of breakfast logging.', howToEarn: 'Log food at breakfast on 7 consecutive days.', icon: '🌅', recurring: true }),
  b({ id: 'lunch_streak_7', category: 'streak', name: 'Lunch Legend', description: 'A week of lunch logging.', howToEarn: 'Log food at lunch on 7 consecutive days.', icon: '☀️', recurring: true }),
  b({ id: 'dinner_streak_7', category: 'streak', name: 'Dinner Devotee', description: 'A week of dinner logging.', howToEarn: 'Log food at dinner on 7 consecutive days.', icon: '🌙', recurring: true }),
  b({ id: 'weekend_logger', category: 'streak', name: 'Weekend Warrior', description: 'Saturday and Sunday both logged.', howToEarn: 'Log food on both Saturday and Sunday in the same week.', icon: '🌴', recurring: true }),
  b({ id: 'weekday_warrior', category: 'streak', name: 'Weekday Warrior', description: 'Monday through Friday all logged.', howToEarn: 'Log food every weekday (Mon–Fri) in the same week.', icon: '💼', recurring: true }),
  b({ id: 'full_week_logger', category: 'streak', name: 'Perfect Week', description: 'Every day of the week logged.', howToEarn: 'Log food on all 7 days of a calendar week.', icon: '✅', recurring: true }),
  b({ id: 'meal_complete', category: 'streak', name: 'Full Plate', description: 'Every meal category filled in one day.', howToEarn: 'Log food in every configured meal on a single day.', icon: '🥗', recurring: true }),
  b({ id: 'meal_complete_week', category: 'streak', name: 'Full Week Plates', description: 'Full plate days all week.', howToEarn: 'Log food in every meal on 5+ days in the same week.', icon: '🍽️', recurring: true }),
  b({ id: 'big_day_10', category: 'streak', name: 'Big Day', description: 'Ten or more entries in one day.', howToEarn: 'Log 10 or more food entries on a single day.', icon: '🍔', recurring: true }),
  b({ id: 'big_day_15', category: 'streak', name: 'Bigger Day', description: 'Fifteen entries in one day.', howToEarn: 'Log 15 or more food entries on a single day.', icon: '🍕', recurring: true }),

  b({ id: 'note_streak_3', category: 'streak', name: 'Note Streak', description: 'Three days of journaling in a row.', howToEarn: 'Write a daily note on 3 consecutive days.', icon: '📓', recurring: true }),
  b({ id: 'note_streak_7', category: 'streak', name: 'Journal Week', description: 'A week of daily notes.', howToEarn: 'Write a daily note on 7 consecutive days.', icon: '📔', recurring: true }),
  b({ id: 'note_streak_14', category: 'streak', name: 'Journal Fortnight', description: 'Two weeks of daily notes.', howToEarn: 'Write a daily note on 14 consecutive days.', icon: '📖', recurring: true }),

  // —— Volume & Milestones ——
  b({ id: 'logs_100', category: 'volume', name: 'Century Logger', description: 'One hundred foods logged — keep going!', howToEarn: 'Log 100 total food entries (repeats every 100).', icon: '💯', recurring: true }),
  b({ id: 'recipe_logs_10', category: 'volume', name: 'Recipe Regular', description: 'Recipes are part of your routine.', howToEarn: 'Log recipes 10 times total (repeats every 10).', icon: '🍲', recurring: true }),
  b({ id: 'recipe_logs_50', category: 'volume', name: 'Recipe Enthusiast', description: 'Fifty recipe logs and counting.', howToEarn: 'Log recipes 50 times total (repeats every 50).', icon: '🥘', recurring: true }),
  // —— Special & Fun ——
  b({ id: 'first_favorite', category: 'special', name: 'Favorite Finder', description: 'You marked a go-to food for quick logging.', howToEarn: 'Add your first favorite food.', icon: '⭐', recurring: false }),
  b({ id: 'five_favorites', category: 'special', name: 'Favorite Five', description: 'Five favorite foods saved.', howToEarn: 'Mark 5 foods as favorites.', icon: '🌟', recurring: false }),
  b({ id: 'ten_favorites', category: 'special', name: 'Favorite Ten', description: 'Ten favorites in your quick-add list.', howToEarn: 'Mark 10 foods as favorites.', icon: '✨', recurring: false }),
  b({ id: 'custom_recipe', category: 'special', name: 'Recipe Tweaker', description: 'You customized a recipe for one day.', howToEarn: 'Log a recipe with customized ingredient portions.', icon: '🛠️', recurring: false }),
  b({ id: 'categories_five', category: 'special', name: 'Category Curator', description: 'Five categories organizing your library.', howToEarn: 'Create or use 5 distinct food categories.', icon: '🏷️', recurring: false }),
  b({ id: 'category_tagger', category: 'special', name: 'Tag Master', description: 'Ten foods neatly categorized.', howToEarn: 'Assign a category to 10 different library foods.', icon: '🔖', recurring: false }),
]

export const BADGE_BY_ID: Record<BadgeId, BadgeDefinition> = Object.fromEntries(
  BADGE_DEFINITIONS.map((badge) => [badge.id, badge]),
) as Record<BadgeId, BadgeDefinition>

export const ALL_BADGE_IDS = BADGE_DEFINITIONS.map((b) => b.id) as BadgeId[]