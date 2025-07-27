# Median of Two Sorted Arrays

**Difficulty:** 🔴 Hard
**Category:** algorithms
**Tags:** binary-search, divide-and-conquer, array

---

## Problem Description

Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).

## Input Format

- `nums1`: An integer array of size `m`
- `nums2`: An integer array of size `n`

## Output Format

A double representing the median of the two sorted arrays.

## Constraints

- nums1.length == m
- nums2.length == n
- 0 ≤ m ≤ 1000
- 0 ≤ n ≤ 1000
- 1 ≤ m + n ≤ 2000
- -10^6 ≤ nums1[i], nums2[i] ≤ 10^6

## Examples

### Example 1

**Input:**
```
nums1 = [1,3], nums2 = [2]
```

**Output:**
```
2.00000
```

**Explanation:** merged array = [1,2,3] and median is 2.

### Example 2

**Input:**
```
nums1 = [1,2], nums2 = [3,4]
```

**Output:**
```
2.50000
```

**Explanation:** merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.

## Solution

Use binary search to find the correct partition of both arrays such that elements on the left are smaller than elements on the right.

```python
def findMedianSortedArrays(nums1, nums2):
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    
    m, n = len(nums1), len(nums2)
    left, right = 0, m
    
    while left <= right:
        partition1 = (left + right) // 2
        partition2 = (m + n + 1) // 2 - partition1
        
        max_left1 = float('-inf') if partition1 == 0 else nums1[partition1 - 1]
        min_right1 = float('inf') if partition1 == m else nums1[partition1]
        
        max_left2 = float('-inf') if partition2 == 0 else nums2[partition2 - 1]
        min_right2 = float('inf') if partition2 == n else nums2[partition2]
        
        if max_left1 <= min_right2 and max_left2 <= min_right1:
            if (m + n) % 2 == 0:
                return (max(max_left1, max_left2) + min(min_right1, min_right2)) / 2
            else:
                return max(max_left1, max_left2)
        elif max_left1 > min_right2:
            right = partition1 - 1
        else:
            left = partition1 + 1
    
    raise ValueError("Input arrays are not sorted")
```

Time Complexity: O(log(min(m, n)))
Space Complexity: O(1)

---

*created by expert-developer*

*Created with CODEER Platform*
