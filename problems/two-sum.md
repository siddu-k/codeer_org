# Two Sum

**Difficulty:** 🟢 Easy
**Category:** algorithms
**Tags:** array, hash-table

---

## Problem Description

Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

## Input Format

- An array of integers `nums`
- An integer `target`

## Output Format

Return an array of two indices `[i, j]` where `nums[i] + nums[j] = target`.

## Constraints

- 2 ≤ nums.length ≤ 10^4
- -10^9 ≤ nums[i] ≤ 10^9
- -10^9 ≤ target ≤ 10^9
- Only one valid answer exists.

## Examples

### Example 1

**Input:**
```
nums = [2,7,11,15], target = 9
```

**Output:**
```
[0,1]
```

**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].

### Example 2

**Input:**
```
nums = [3,2,4], target = 6
```

**Output:**
```
[1,2]
```

**Explanation:** Because nums[1] + nums[2] == 6, we return [1, 2].

### Example 3

**Input:**
```
nums = [3,3], target = 6
```

**Output:**
```
[0,1]
```

**Explanation:** Because nums[0] + nums[1] == 6, we return [0, 1].

## Solution

The most efficient approach is to use a hash map to store the numbers we've seen so far and their indices.

```python
def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []
```

Time Complexity: O(n)
Space Complexity: O(n)

---

*created by github-user*

*Created with CODEER Platform*
