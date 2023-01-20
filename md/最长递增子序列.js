const arr = [1, 8, 5, 3, 4, 9, 7, 6] // 1 3 4 9

// 1.动态规划 性能不好

// 2.贪心 + 二分查找 ✅
// 在查找中如果当前的比最后一个大，直接插入
// 如果当前这个比最后一个小，采用二分查找，找到已经排好的列表，找到比当前数大的那一项 将其替换掉

function getSequence(arr) {
  const len = arr.length
  const result = [0] // 索引
  const p = arr.slice(0) // 存放索引

  let start
  let end

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    // 0 是新增
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1]
      // 比result里最后一项大，直接放入最后
      if (arr[resultLastIndex] < arrI) {
        // 记录当前值的前一个值的索引
        p[i] = resultLastIndex

        result.push(i)
        continue
      }

      // 二分查找找到比当前值大的
      start = 0
      end = result.length - 1
      while (start < end) {
        const mid = ((start + end) / 2) | 0
        if (arrI > arr[result[mid]]) {
          start = mid + 1
        } else {
          end = mid
        }
      }

      // 如果值小于result中的值，则替换位置
      if (arrI < arr[result[start]]) {
        // start 为0 表示是第一个，不用记录前面值的位置
        if (start > 0) {
          p[i] = result[start - 1]
        }

        result[start] = i
      }
    }
  }

  let resLen = result.length
  let last = result[resLen - 1]
  // 根据前驱节点向前查找
  while (resLen-- > 0) {
    result[resLen] = last
    last = p[last]
  }

  return result
}

getSequence(arr)
