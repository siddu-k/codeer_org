# Longest Substring Without Repeating Characters

**Difficulty:** 🟡 Medium
**Category:** string-processing
**Tags:** sliding-window, hash-table, string

---

## Problem Description

Given a string `s`, find the length of the longest substring without repeating characters.

## Input Format

A string `s` consisting of English letters, digits, symbols and spaces.

## Output Format

An integer representing the length of the longest substring without repeating characters.

## Constraints

- 0 ≤ s.length ≤ 5 * 10^4
- `s` consists of English letters, digits, symbols and spaces.

## Examples

### Example 1

**Input:**
```
s = "abcabcbb"
```

**Output:**
```
3
```

**Explanation:** The answer is "abc", with the length of 3.

### Example 2

**Input:**
```
s = "bbbbb"
```

**Output:**
```
1
```

**Explanation:** The answer is "b", with the length of 1.

### Example 3

**Input:**
```
s = "pwwkew"
```

**Output:**
```
3
```

**Explanation:** The answer is "wke", with the length of 3.

## Solution

Use the sliding window technique with a hash set to track characters in the current window.

```python
def lengthOfLongestSubstring(s):
    char_set = set()
    left = 0
    max_length = 0
    
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_length = max(max_length, right - left + 1)
    
    return max_length
```

Time Complexity: O(n)
Space Complexity: O(min(m, n)) where m is the size of the character set

---

*created by developer*

*Created with CODEER Platform*
