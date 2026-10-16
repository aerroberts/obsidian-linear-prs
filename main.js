"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/diff2html/lib/types.js
var require_types = __commonJS({
  "node_modules/diff2html/lib/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ColorSchemeType = exports2.DiffStyleType = exports2.LineMatchingType = exports2.OutputFormatType = exports2.LineType = void 0;
    var LineType;
    (function(LineType2) {
      LineType2["INSERT"] = "insert";
      LineType2["DELETE"] = "delete";
      LineType2["CONTEXT"] = "context";
    })(LineType || (exports2.LineType = LineType = {}));
    exports2.OutputFormatType = {
      LINE_BY_LINE: "line-by-line",
      SIDE_BY_SIDE: "side-by-side"
    };
    exports2.LineMatchingType = {
      LINES: "lines",
      WORDS: "words",
      NONE: "none"
    };
    exports2.DiffStyleType = {
      WORD: "word",
      CHAR: "char"
    };
    var ColorSchemeType2;
    (function(ColorSchemeType3) {
      ColorSchemeType3["AUTO"] = "auto";
      ColorSchemeType3["DARK"] = "dark";
      ColorSchemeType3["LIGHT"] = "light";
    })(ColorSchemeType2 || (exports2.ColorSchemeType = ColorSchemeType2 = {}));
  }
});

// node_modules/diff2html/lib/utils.js
var require_utils = __commonJS({
  "node_modules/diff2html/lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.escapeForRegExp = escapeForRegExp;
    exports2.unifyPath = unifyPath;
    exports2.hashCode = hashCode;
    exports2.max = max;
    var specials = [
      "-",
      "[",
      "]",
      "/",
      "{",
      "}",
      "(",
      ")",
      "*",
      "+",
      "?",
      ".",
      "\\",
      "^",
      "$",
      "|"
    ];
    var regex = RegExp("[" + specials.join("\\") + "]", "g");
    function escapeForRegExp(str) {
      return str.replace(regex, "\\$&");
    }
    function unifyPath(path) {
      return path ? path.replace(/\\/g, "/") : path;
    }
    function hashCode(text) {
      let i, chr, len;
      let hash = 0;
      for (i = 0, len = text.length; i < len; i++) {
        chr = text.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
      }
      return hash;
    }
    function max(arr) {
      const length = arr.length;
      let max2 = -Infinity;
      for (let i = 0; i < length; i++) {
        max2 = Math.max(max2, arr[i]);
      }
      return max2;
    }
  }
});

// node_modules/diff2html/lib/diff-parser.js
var require_diff_parser = __commonJS({
  "node_modules/diff2html/lib/diff-parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parse = parse2;
    var types_1 = require_types();
    var utils_1 = require_utils();
    function getExtension(filename, language) {
      const filenameParts = filename.split(".");
      return filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : language;
    }
    function startsWithAny(str, prefixes) {
      return prefixes.reduce((startsWith, prefix) => startsWith || str.startsWith(prefix), false);
    }
    var baseDiffFilenamePrefixes = ["a/", "b/", "i/", "w/", "c/", "o/"];
    function getFilename(line, linePrefix, extraPrefix) {
      const prefixes = extraPrefix !== void 0 ? [...baseDiffFilenamePrefixes, extraPrefix] : baseDiffFilenamePrefixes;
      const FilenameRegExp = linePrefix ? new RegExp(`^${(0, utils_1.escapeForRegExp)(linePrefix)} "?(.+?)"?$`) : new RegExp('^"?(.+?)"?$');
      const [, filename = ""] = FilenameRegExp.exec(line) || [];
      const matchingPrefix = prefixes.find((p) => filename.indexOf(p) === 0);
      const fnameWithoutPrefix = matchingPrefix ? filename.slice(matchingPrefix.length) : filename;
      return fnameWithoutPrefix.replace(/\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? [+-]\d{4}.*$/, "");
    }
    function getSrcFilename(line, srcPrefix) {
      return getFilename(line, "---", srcPrefix);
    }
    function getDstFilename(line, dstPrefix) {
      return getFilename(line, "+++", dstPrefix);
    }
    function parse2(diffInput, config = {}) {
      const files = [];
      let currentFile = null;
      let currentBlock = null;
      let oldLine = null;
      let oldLine2 = null;
      let newLine = null;
      let possibleOldName = null;
      let possibleNewName = null;
      const oldFileNameHeader = "--- ";
      const newFileNameHeader = "+++ ";
      const hunkHeaderPrefix = "@@";
      const oldMode = /^old mode (\d{6})/;
      const newMode = /^new mode (\d{6})/;
      const deletedFileMode = /^deleted file mode (\d{6})/;
      const newFileMode = /^new file mode (\d{6})/;
      const copyFrom = /^copy from "?(.+)"?/;
      const copyTo = /^copy to "?(.+)"?/;
      const renameFrom = /^rename from "?(.+)"?/;
      const renameTo = /^rename to "?(.+)"?/;
      const similarityIndex = /^similarity index (\d+)%/;
      const dissimilarityIndex = /^dissimilarity index (\d+)%/;
      const index = /^index ([\da-z]+)\.\.([\da-z]+)\s*(\d{6})?/;
      const binaryFiles = /^Binary files (.*) and (.*) differ/;
      const binaryDiff = /^GIT binary patch/;
      const combinedIndex = /^index ([\da-z]+),([\da-z]+)\.\.([\da-z]+)/;
      const combinedMode = /^mode (\d{6}),(\d{6})\.\.(\d{6})/;
      const combinedNewFile = /^new file mode (\d{6})/;
      const combinedDeletedFile = /^deleted file mode (\d{6}),(\d{6})/;
      const diffLines = diffInput.replace(/\\ No newline at end of file/g, "").replace(/\r\n?/g, "\n").split("\n");
      function saveBlock() {
        if (currentBlock !== null && currentFile !== null) {
          currentFile.blocks.push(currentBlock);
          currentBlock = null;
        }
      }
      function saveFile() {
        if (currentFile !== null) {
          if (!currentFile.oldName && possibleOldName !== null) {
            currentFile.oldName = possibleOldName;
          }
          if (!currentFile.newName && possibleNewName !== null) {
            currentFile.newName = possibleNewName;
          }
          if (currentFile.newName) {
            files.push(currentFile);
            currentFile = null;
          }
        }
        possibleOldName = null;
        possibleNewName = null;
      }
      function startFile() {
        saveBlock();
        saveFile();
        currentFile = {
          blocks: [],
          deletedLines: 0,
          addedLines: 0
        };
      }
      function startBlock(line) {
        saveBlock();
        let values;
        if (currentFile !== null) {
          if (values = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*/.exec(line)) {
            currentFile.isCombined = false;
            oldLine = parseInt(values[1], 10);
            newLine = parseInt(values[2], 10);
          } else if (values = /^@@@ -(\d+)(?:,\d+)? -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@@.*/.exec(line)) {
            currentFile.isCombined = true;
            oldLine = parseInt(values[1], 10);
            oldLine2 = parseInt(values[2], 10);
            newLine = parseInt(values[3], 10);
          } else {
            if (line.startsWith(hunkHeaderPrefix)) {
              console.error("Failed to parse lines, starting in 0!");
            }
            oldLine = 0;
            newLine = 0;
            currentFile.isCombined = false;
          }
        }
        currentBlock = {
          lines: [],
          oldStartLine: oldLine,
          oldStartLine2: oldLine2,
          newStartLine: newLine,
          header: line
        };
      }
      function createLine(line) {
        if (currentFile === null || currentBlock === null || oldLine === null || newLine === null)
          return;
        const currentLine = {
          content: line
        };
        const addedPrefixes = currentFile.isCombined ? ["+ ", " +", "++"] : ["+"];
        const deletedPrefixes = currentFile.isCombined ? ["- ", " -", "--"] : ["-"];
        if (startsWithAny(line, addedPrefixes)) {
          currentFile.addedLines++;
          currentLine.type = types_1.LineType.INSERT;
          currentLine.oldNumber = void 0;
          currentLine.newNumber = newLine++;
        } else if (startsWithAny(line, deletedPrefixes)) {
          currentFile.deletedLines++;
          currentLine.type = types_1.LineType.DELETE;
          currentLine.oldNumber = oldLine++;
          currentLine.newNumber = void 0;
        } else {
          currentLine.type = types_1.LineType.CONTEXT;
          currentLine.oldNumber = oldLine++;
          currentLine.newNumber = newLine++;
        }
        currentBlock.lines.push(currentLine);
      }
      function existHunkHeader(line, lineIdx) {
        let idx = lineIdx;
        while (idx < diffLines.length - 3) {
          if (line.startsWith("diff")) {
            return false;
          }
          if (diffLines[idx].startsWith(oldFileNameHeader) && diffLines[idx + 1].startsWith(newFileNameHeader) && diffLines[idx + 2].startsWith(hunkHeaderPrefix)) {
            return true;
          }
          idx++;
        }
        return false;
      }
      diffLines.forEach((line, lineIndex) => {
        if (!line || line.startsWith("*")) {
          return;
        }
        let values;
        const prevLine = diffLines[lineIndex - 1];
        const nxtLine = diffLines[lineIndex + 1];
        const afterNxtLine = diffLines[lineIndex + 2];
        if (line.startsWith("diff --git") || line.startsWith("diff --combined")) {
          startFile();
          const gitDiffStart = /^diff --git "?([a-ciow]\/.+)"? "?([a-ciow]\/.+)"?/;
          if (values = gitDiffStart.exec(line)) {
            possibleOldName = getFilename(values[1], void 0, config.dstPrefix);
            possibleNewName = getFilename(values[2], void 0, config.srcPrefix);
          }
          if (currentFile === null) {
            throw new Error("Where is my file !!!");
          }
          currentFile.isGitDiff = true;
          return;
        }
        if (line.startsWith("Binary files") && !(currentFile === null || currentFile === void 0 ? void 0 : currentFile.isGitDiff)) {
          startFile();
          const unixDiffBinaryStart = /^Binary files "?([a-ciow]\/.+)"? and "?([a-ciow]\/.+)"? differ/;
          if (values = unixDiffBinaryStart.exec(line)) {
            possibleOldName = getFilename(values[1], void 0, config.dstPrefix);
            possibleNewName = getFilename(values[2], void 0, config.srcPrefix);
          }
          if (currentFile === null) {
            throw new Error("Where is my file !!!");
          }
          currentFile.isBinary = true;
          return;
        }
        if (!currentFile || !currentFile.isGitDiff && currentFile && line.startsWith(oldFileNameHeader) && nxtLine.startsWith(newFileNameHeader) && afterNxtLine.startsWith(hunkHeaderPrefix)) {
          startFile();
        }
        if (currentFile === null || currentFile === void 0 ? void 0 : currentFile.isTooBig) {
          return;
        }
        if (currentFile && (typeof config.diffMaxChanges === "number" && currentFile.addedLines + currentFile.deletedLines > config.diffMaxChanges || typeof config.diffMaxLineLength === "number" && line.length > config.diffMaxLineLength)) {
          currentFile.isTooBig = true;
          currentFile.addedLines = 0;
          currentFile.deletedLines = 0;
          currentFile.blocks = [];
          currentBlock = null;
          const message = typeof config.diffTooBigMessage === "function" ? config.diffTooBigMessage(files.length) : "Diff too big to be displayed";
          startBlock(message);
          return;
        }
        if (line.startsWith(oldFileNameHeader) && nxtLine.startsWith(newFileNameHeader) || line.startsWith(newFileNameHeader) && prevLine.startsWith(oldFileNameHeader)) {
          if (currentFile && !currentFile.oldName && line.startsWith("--- ") && (values = getSrcFilename(line, config.srcPrefix))) {
            currentFile.oldName = values;
            currentFile.language = getExtension(currentFile.oldName, currentFile.language);
            return;
          }
          if (currentFile && !currentFile.newName && line.startsWith("+++ ") && (values = getDstFilename(line, config.dstPrefix))) {
            currentFile.newName = values;
            currentFile.language = getExtension(currentFile.newName, currentFile.language);
            return;
          }
        }
        if (currentFile && (line.startsWith(hunkHeaderPrefix) || currentFile.isGitDiff && currentFile.oldName && currentFile.newName && !currentBlock)) {
          startBlock(line);
          return;
        }
        if (currentBlock && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
          createLine(line);
          return;
        }
        const doesNotExistHunkHeader = !existHunkHeader(line, lineIndex);
        if (currentFile === null) {
          throw new Error("Where is my file !!!");
        }
        if (values = oldMode.exec(line)) {
          currentFile.oldMode = values[1];
        } else if (values = newMode.exec(line)) {
          currentFile.newMode = values[1];
        } else if (values = deletedFileMode.exec(line)) {
          currentFile.deletedFileMode = values[1];
          currentFile.isDeleted = true;
        } else if (values = newFileMode.exec(line)) {
          currentFile.newFileMode = values[1];
          currentFile.isNew = true;
        } else if (values = copyFrom.exec(line)) {
          if (doesNotExistHunkHeader) {
            currentFile.oldName = values[1];
          }
          currentFile.isCopy = true;
        } else if (values = copyTo.exec(line)) {
          if (doesNotExistHunkHeader) {
            currentFile.newName = values[1];
          }
          currentFile.isCopy = true;
        } else if (values = renameFrom.exec(line)) {
          if (doesNotExistHunkHeader) {
            currentFile.oldName = values[1];
          }
          currentFile.isRename = true;
        } else if (values = renameTo.exec(line)) {
          if (doesNotExistHunkHeader) {
            currentFile.newName = values[1];
          }
          currentFile.isRename = true;
        } else if (values = binaryFiles.exec(line)) {
          currentFile.isBinary = true;
          currentFile.oldName = getFilename(values[1], void 0, config.srcPrefix);
          currentFile.newName = getFilename(values[2], void 0, config.dstPrefix);
          startBlock("Binary file");
        } else if (binaryDiff.test(line)) {
          currentFile.isBinary = true;
          startBlock(line);
        } else if (values = similarityIndex.exec(line)) {
          currentFile.unchangedPercentage = parseInt(values[1], 10);
        } else if (values = dissimilarityIndex.exec(line)) {
          currentFile.changedPercentage = parseInt(values[1], 10);
        } else if (values = index.exec(line)) {
          currentFile.checksumBefore = values[1];
          currentFile.checksumAfter = values[2];
          if (values[3])
            currentFile.mode = values[3];
        } else if (values = combinedIndex.exec(line)) {
          currentFile.checksumBefore = [values[2], values[3]];
          currentFile.checksumAfter = values[1];
        } else if (values = combinedMode.exec(line)) {
          currentFile.oldMode = [values[2], values[3]];
          currentFile.newMode = values[1];
        } else if (values = combinedNewFile.exec(line)) {
          currentFile.newFileMode = values[1];
          currentFile.isNew = true;
        } else if (values = combinedDeletedFile.exec(line)) {
          currentFile.deletedFileMode = values[1];
          currentFile.isDeleted = true;
        }
      });
      saveBlock();
      saveFile();
      return files;
    }
  }
});

// node_modules/diff/libcjs/diff/base.js
var require_base = __commonJS({
  "node_modules/diff/libcjs/diff/base.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var Diff = (
      /** @class */
      (function() {
        function Diff2() {
        }
        Diff2.prototype.diff = function(oldStr, newStr, options) {
          if (options === void 0) {
            options = {};
          }
          var callback;
          if (typeof options === "function") {
            callback = options;
            options = {};
          } else if ("callback" in options) {
            callback = options.callback;
          }
          var oldString = this.castInput(oldStr, options);
          var newString = this.castInput(newStr, options);
          var oldTokens = this.removeEmpty(this.tokenize(oldString, options));
          var newTokens = this.removeEmpty(this.tokenize(newString, options));
          return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
        };
        Diff2.prototype.diffWithOptionsObj = function(oldTokens, newTokens, options, callback) {
          var _this = this;
          var _a;
          var done = function(value) {
            value = _this.postProcess(value, options);
            if (callback) {
              setTimeout(function() {
                callback(value);
              }, 0);
              return void 0;
            } else {
              return value;
            }
          };
          var newLen = newTokens.length, oldLen = oldTokens.length;
          var editLength = 1;
          var maxEditLength = newLen + oldLen;
          if (options.maxEditLength != null) {
            maxEditLength = Math.min(maxEditLength, options.maxEditLength);
          }
          var maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
          var abortAfterTimestamp = Date.now() + maxExecutionTime;
          var bestPath = [{ oldPos: -1, lastComponent: void 0 }];
          var newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
          if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
            return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
          }
          var minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
          var execEditLength = function() {
            for (var diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
              var basePath = void 0;
              var removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
              if (removePath) {
                bestPath[diagonalPath - 1] = void 0;
              }
              var canAdd = false;
              if (addPath) {
                var addPathNewPos = addPath.oldPos - diagonalPath;
                canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
              }
              var canRemove = removePath && removePath.oldPos + 1 < oldLen;
              if (!canAdd && !canRemove) {
                bestPath[diagonalPath] = void 0;
                continue;
              }
              if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
                basePath = _this.addToPath(addPath, true, false, 0, options);
              } else {
                basePath = _this.addToPath(removePath, false, true, 1, options);
              }
              newPos = _this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
              if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
                return done(_this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
              } else {
                bestPath[diagonalPath] = basePath;
                if (basePath.oldPos + 1 >= oldLen) {
                  maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
                }
                if (newPos + 1 >= newLen) {
                  minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
                }
              }
            }
            editLength++;
          };
          if (callback) {
            (function exec() {
              setTimeout(function() {
                if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
                  return callback(void 0);
                }
                if (!execEditLength()) {
                  exec();
                }
              }, 0);
            })();
          } else {
            while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
              var ret = execEditLength();
              if (ret) {
                return ret;
              }
            }
          }
        };
        Diff2.prototype.addToPath = function(path, added, removed, oldPosInc, options) {
          var last = path.lastComponent;
          if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
            return {
              oldPos: path.oldPos + oldPosInc,
              lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
            };
          } else {
            return {
              oldPos: path.oldPos + oldPosInc,
              lastComponent: { count: 1, added, removed, previousComponent: last }
            };
          }
        };
        Diff2.prototype.extractCommon = function(basePath, newTokens, oldTokens, diagonalPath, options) {
          var newLen = newTokens.length, oldLen = oldTokens.length;
          var oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
          while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
            newPos++;
            oldPos++;
            commonCount++;
            if (options.oneChangePerToken) {
              basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
            }
          }
          if (commonCount && !options.oneChangePerToken) {
            basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
          }
          basePath.oldPos = oldPos;
          return newPos;
        };
        Diff2.prototype.equals = function(left, right, options) {
          if (options.comparator) {
            return options.comparator(left, right);
          } else {
            return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
          }
        };
        Diff2.prototype.removeEmpty = function(array) {
          var ret = [];
          for (var i = 0; i < array.length; i++) {
            if (array[i]) {
              ret.push(array[i]);
            }
          }
          return ret;
        };
        Diff2.prototype.castInput = function(value, options) {
          return value;
        };
        Diff2.prototype.tokenize = function(value, options) {
          return Array.from(value);
        };
        Diff2.prototype.join = function(chars) {
          return chars.join("");
        };
        Diff2.prototype.postProcess = function(changeObjects, options) {
          return changeObjects;
        };
        Object.defineProperty(Diff2.prototype, "useLongestToken", {
          get: function() {
            return false;
          },
          enumerable: false,
          configurable: true
        });
        Diff2.prototype.buildValues = function(lastComponent, newTokens, oldTokens) {
          var components = [];
          var nextComponent;
          while (lastComponent) {
            components.push(lastComponent);
            nextComponent = lastComponent.previousComponent;
            delete lastComponent.previousComponent;
            lastComponent = nextComponent;
          }
          components.reverse();
          var componentLen = components.length;
          var componentPos = 0, newPos = 0, oldPos = 0;
          for (; componentPos < componentLen; componentPos++) {
            var component = components[componentPos];
            if (!component.removed) {
              if (!component.added && this.useLongestToken) {
                var value = newTokens.slice(newPos, newPos + component.count);
                value = value.map(function(value2, i) {
                  var oldValue = oldTokens[oldPos + i];
                  return oldValue.length > value2.length ? oldValue : value2;
                });
                component.value = this.join(value);
              } else {
                component.value = this.join(newTokens.slice(newPos, newPos + component.count));
              }
              newPos += component.count;
              if (!component.added) {
                oldPos += component.count;
              }
            } else {
              component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
              oldPos += component.count;
            }
          }
          return components;
        };
        return Diff2;
      })()
    );
    exports2.default = Diff;
  }
});

// node_modules/diff/libcjs/diff/character.js
var require_character = __commonJS({
  "node_modules/diff/libcjs/diff/character.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.characterDiff = void 0;
    exports2.diffChars = diffChars;
    var base_js_1 = require_base();
    var CharacterDiff = (
      /** @class */
      (function(_super) {
        __extends(CharacterDiff2, _super);
        function CharacterDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        return CharacterDiff2;
      })(base_js_1.default)
    );
    exports2.characterDiff = new CharacterDiff();
    function diffChars(oldStr, newStr, options) {
      return exports2.characterDiff.diff(oldStr, newStr, options);
    }
  }
});

// node_modules/diff/libcjs/util/string.js
var require_string = __commonJS({
  "node_modules/diff/libcjs/util/string.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.longestCommonPrefix = longestCommonPrefix;
    exports2.longestCommonSuffix = longestCommonSuffix;
    exports2.replacePrefix = replacePrefix;
    exports2.replaceSuffix = replaceSuffix;
    exports2.removePrefix = removePrefix;
    exports2.removeSuffix = removeSuffix;
    exports2.maximumOverlap = maximumOverlap;
    exports2.hasOnlyWinLineEndings = hasOnlyWinLineEndings;
    exports2.hasOnlyUnixLineEndings = hasOnlyUnixLineEndings;
    exports2.segment = segment;
    exports2.trailingWs = trailingWs;
    exports2.leadingWs = leadingWs;
    exports2.leadingAndTrailingWs = leadingAndTrailingWs;
    function longestCommonPrefix(str1, str2) {
      var i;
      for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[i] != str2[i]) {
          return str1.slice(0, i);
        }
      }
      return str1.slice(0, i);
    }
    function longestCommonSuffix(str1, str2) {
      var i;
      if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
        return "";
      }
      for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
          return str1.slice(-i);
        }
      }
      return str1.slice(-i);
    }
    function replacePrefix(string, oldPrefix, newPrefix) {
      if (string.slice(0, oldPrefix.length) != oldPrefix) {
        throw Error("string ".concat(JSON.stringify(string), " doesn't start with prefix ").concat(JSON.stringify(oldPrefix), "; this is a bug"));
      }
      return newPrefix + string.slice(oldPrefix.length);
    }
    function replaceSuffix(string, oldSuffix, newSuffix) {
      if (!oldSuffix) {
        return string + newSuffix;
      }
      if (string.slice(-oldSuffix.length) != oldSuffix) {
        throw Error("string ".concat(JSON.stringify(string), " doesn't end with suffix ").concat(JSON.stringify(oldSuffix), "; this is a bug"));
      }
      return string.slice(0, -oldSuffix.length) + newSuffix;
    }
    function removePrefix(string, oldPrefix) {
      return replacePrefix(string, oldPrefix, "");
    }
    function removeSuffix(string, oldSuffix) {
      return replaceSuffix(string, oldSuffix, "");
    }
    function maximumOverlap(string1, string2) {
      return string2.slice(0, overlapCount(string1, string2));
    }
    function overlapCount(a, b) {
      var startA = 0;
      if (a.length > b.length) {
        startA = a.length - b.length;
      }
      var endB = b.length;
      if (a.length < b.length) {
        endB = a.length;
      }
      var map = Array(endB);
      var k = 0;
      map[0] = 0;
      for (var j = 1; j < endB; j++) {
        if (b[j] == b[k]) {
          map[j] = map[k];
        } else {
          map[j] = k;
        }
        while (k > 0 && b[j] != b[k]) {
          k = map[k];
        }
        if (b[j] == b[k]) {
          k++;
        }
      }
      k = 0;
      for (var i = startA; i < a.length; i++) {
        while (k > 0 && a[i] != b[k]) {
          k = map[k];
        }
        if (a[i] == b[k]) {
          k++;
        }
      }
      return k;
    }
    function hasOnlyWinLineEndings(string) {
      return string.includes("\r\n") && !string.startsWith("\n") && !string.match(/[^\r]\n/);
    }
    function hasOnlyUnixLineEndings(string) {
      return !string.includes("\r\n") && string.includes("\n");
    }
    function segment(string, segmenter) {
      var parts = [];
      for (var _i = 0, _a = Array.from(segmenter.segment(string)); _i < _a.length; _i++) {
        var segmentObj = _a[_i];
        var segment_1 = segmentObj.segment;
        if (parts.length && /\s/.test(parts[parts.length - 1]) && /\s/.test(segment_1)) {
          parts[parts.length - 1] += segment_1;
        } else {
          parts.push(segment_1);
        }
      }
      return parts;
    }
    function trailingWs(string, segmenter) {
      if (segmenter) {
        return leadingAndTrailingWs(string, segmenter)[1];
      }
      var i;
      for (i = string.length - 1; i >= 0; i--) {
        if (!string[i].match(/\s/)) {
          break;
        }
      }
      return string.substring(i + 1);
    }
    function leadingWs(string, segmenter) {
      if (segmenter) {
        return leadingAndTrailingWs(string, segmenter)[0];
      }
      var match = string.match(/^\s*/);
      return match ? match[0] : "";
    }
    function leadingAndTrailingWs(string, segmenter) {
      if (!segmenter) {
        return [leadingWs(string), trailingWs(string)];
      }
      if (segmenter.resolvedOptions().granularity != "word") {
        throw new Error('The segmenter passed must have a granularity of "word"');
      }
      var segments = segment(string, segmenter);
      var firstSeg = segments[0];
      var lastSeg = segments[segments.length - 1];
      var head = /\s/.test(firstSeg) ? firstSeg : "";
      var tail = /\s/.test(lastSeg) ? lastSeg : "";
      return [head, tail];
    }
  }
});

// node_modules/diff/libcjs/diff/word.js
var require_word = __commonJS({
  "node_modules/diff/libcjs/diff/word.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.wordsWithSpaceDiff = exports2.wordDiff = void 0;
    exports2.diffWords = diffWords;
    exports2.diffWordsWithSpace = diffWordsWithSpace;
    var base_js_1 = require_base();
    var string_js_1 = require_string();
    var extendedWordChars = "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}";
    var tokenizeIncludingWhitespace = new RegExp("[".concat(extendedWordChars, "]+|\\s+|[^").concat(extendedWordChars, "]"), "ug");
    var WordDiff = (
      /** @class */
      (function(_super) {
        __extends(WordDiff2, _super);
        function WordDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        WordDiff2.prototype.equals = function(left, right, options) {
          if (options.ignoreCase) {
            left = left.toLowerCase();
            right = right.toLowerCase();
          }
          return left.trim() === right.trim();
        };
        WordDiff2.prototype.tokenize = function(value, options) {
          if (options === void 0) {
            options = {};
          }
          var parts;
          if (options.intlSegmenter) {
            var segmenter = options.intlSegmenter;
            if (segmenter.resolvedOptions().granularity != "word") {
              throw new Error('The segmenter passed must have a granularity of "word"');
            }
            parts = (0, string_js_1.segment)(value, segmenter);
          } else {
            parts = value.match(tokenizeIncludingWhitespace) || [];
          }
          var tokens = [];
          var prevPart = null;
          parts.forEach(function(part) {
            if (/\s/.test(part)) {
              if (prevPart == null) {
                tokens.push(part);
              } else {
                tokens.push(tokens.pop() + part);
              }
            } else if (prevPart != null && /\s/.test(prevPart)) {
              if (tokens[tokens.length - 1] == prevPart) {
                tokens.push(tokens.pop() + part);
              } else {
                tokens.push(prevPart + part);
              }
            } else {
              tokens.push(part);
            }
            prevPart = part;
          });
          return tokens;
        };
        WordDiff2.prototype.join = function(tokens) {
          return tokens.map(function(token, i) {
            if (i == 0) {
              return token;
            } else {
              return token.replace(/^\s+/, "");
            }
          }).join("");
        };
        WordDiff2.prototype.postProcess = function(changes, options) {
          if (!changes || options.oneChangePerToken) {
            return changes;
          }
          var lastKeep = null;
          var insertion = null;
          var deletion = null;
          changes.forEach(function(change) {
            if (change.added) {
              insertion = change;
            } else if (change.removed) {
              deletion = change;
            } else {
              if (insertion || deletion) {
                dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change, options.intlSegmenter);
              }
              lastKeep = change;
              insertion = null;
              deletion = null;
            }
          });
          if (insertion || deletion) {
            dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null, options.intlSegmenter);
          }
          return changes;
        };
        return WordDiff2;
      })(base_js_1.default)
    );
    exports2.wordDiff = new WordDiff();
    function diffWords(oldStr, newStr, options) {
      if ((options === null || options === void 0 ? void 0 : options.ignoreWhitespace) != null && !options.ignoreWhitespace) {
        return diffWordsWithSpace(oldStr, newStr, options);
      }
      return exports2.wordDiff.diff(oldStr, newStr, options);
    }
    function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep, segmenter) {
      if (deletion && insertion) {
        var _a = (0, string_js_1.leadingAndTrailingWs)(deletion.value, segmenter), oldWsPrefix = _a[0], oldWsSuffix = _a[1];
        var _b = (0, string_js_1.leadingAndTrailingWs)(insertion.value, segmenter), newWsPrefix = _b[0], newWsSuffix = _b[1];
        if (startKeep) {
          var commonWsPrefix = (0, string_js_1.longestCommonPrefix)(oldWsPrefix, newWsPrefix);
          startKeep.value = (0, string_js_1.replaceSuffix)(startKeep.value, newWsPrefix, commonWsPrefix);
          deletion.value = (0, string_js_1.removePrefix)(deletion.value, commonWsPrefix);
          insertion.value = (0, string_js_1.removePrefix)(insertion.value, commonWsPrefix);
        }
        if (endKeep) {
          var commonWsSuffix = (0, string_js_1.longestCommonSuffix)(oldWsSuffix, newWsSuffix);
          endKeep.value = (0, string_js_1.replacePrefix)(endKeep.value, newWsSuffix, commonWsSuffix);
          deletion.value = (0, string_js_1.removeSuffix)(deletion.value, commonWsSuffix);
          insertion.value = (0, string_js_1.removeSuffix)(insertion.value, commonWsSuffix);
        }
      } else if (insertion) {
        if (startKeep) {
          var ws = (0, string_js_1.leadingWs)(insertion.value, segmenter);
          insertion.value = insertion.value.substring(ws.length);
        }
        if (endKeep) {
          var ws = (0, string_js_1.leadingWs)(endKeep.value, segmenter);
          endKeep.value = endKeep.value.substring(ws.length);
        }
      } else if (startKeep && endKeep) {
        var newWsFull = (0, string_js_1.leadingWs)(endKeep.value, segmenter), _c = (0, string_js_1.leadingAndTrailingWs)(deletion.value, segmenter), delWsStart = _c[0], delWsEnd = _c[1];
        var newWsStart = (0, string_js_1.longestCommonPrefix)(newWsFull, delWsStart);
        deletion.value = (0, string_js_1.removePrefix)(deletion.value, newWsStart);
        var newWsEnd = (0, string_js_1.longestCommonSuffix)((0, string_js_1.removePrefix)(newWsFull, newWsStart), delWsEnd);
        deletion.value = (0, string_js_1.removeSuffix)(deletion.value, newWsEnd);
        endKeep.value = (0, string_js_1.replacePrefix)(endKeep.value, newWsFull, newWsEnd);
        startKeep.value = (0, string_js_1.replaceSuffix)(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
      } else if (endKeep) {
        var endKeepWsPrefix = (0, string_js_1.leadingWs)(endKeep.value, segmenter);
        var deletionWsSuffix = (0, string_js_1.trailingWs)(deletion.value, segmenter);
        var overlap = (0, string_js_1.maximumOverlap)(deletionWsSuffix, endKeepWsPrefix);
        deletion.value = (0, string_js_1.removeSuffix)(deletion.value, overlap);
      } else if (startKeep) {
        var startKeepWsSuffix = (0, string_js_1.trailingWs)(startKeep.value, segmenter);
        var deletionWsPrefix = (0, string_js_1.leadingWs)(deletion.value, segmenter);
        var overlap = (0, string_js_1.maximumOverlap)(startKeepWsSuffix, deletionWsPrefix);
        deletion.value = (0, string_js_1.removePrefix)(deletion.value, overlap);
      }
    }
    var WordsWithSpaceDiff = (
      /** @class */
      (function(_super) {
        __extends(WordsWithSpaceDiff2, _super);
        function WordsWithSpaceDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        WordsWithSpaceDiff2.prototype.tokenize = function(value) {
          var regex = new RegExp("(\\r?\\n)|[".concat(extendedWordChars, "]+|[^\\S\\n\\r]+|[^").concat(extendedWordChars, "]"), "ug");
          return value.match(regex) || [];
        };
        return WordsWithSpaceDiff2;
      })(base_js_1.default)
    );
    exports2.wordsWithSpaceDiff = new WordsWithSpaceDiff();
    function diffWordsWithSpace(oldStr, newStr, options) {
      return exports2.wordsWithSpaceDiff.diff(oldStr, newStr, options);
    }
  }
});

// node_modules/diff/libcjs/util/params.js
var require_params = __commonJS({
  "node_modules/diff/libcjs/util/params.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateOptions = generateOptions;
    function generateOptions(options, defaults) {
      if (typeof options === "function") {
        defaults.callback = options;
      } else if (options) {
        for (var name in options) {
          if (Object.prototype.hasOwnProperty.call(options, name)) {
            defaults[name] = options[name];
          }
        }
      }
      return defaults;
    }
  }
});

// node_modules/diff/libcjs/diff/line.js
var require_line = __commonJS({
  "node_modules/diff/libcjs/diff/line.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.lineDiff = void 0;
    exports2.diffLines = diffLines;
    exports2.diffTrimmedLines = diffTrimmedLines;
    exports2.tokenize = tokenize;
    var base_js_1 = require_base();
    var params_js_1 = require_params();
    var LineDiff = (
      /** @class */
      (function(_super) {
        __extends(LineDiff2, _super);
        function LineDiff2() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.tokenize = tokenize;
          return _this;
        }
        LineDiff2.prototype.equals = function(left, right, options) {
          if (options.ignoreWhitespace) {
            if (!options.newlineIsToken || !left.includes("\n")) {
              left = left.trim();
            }
            if (!options.newlineIsToken || !right.includes("\n")) {
              right = right.trim();
            }
          } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
            if (left.endsWith("\n")) {
              left = left.slice(0, -1);
            }
            if (right.endsWith("\n")) {
              right = right.slice(0, -1);
            }
          }
          return _super.prototype.equals.call(this, left, right, options);
        };
        return LineDiff2;
      })(base_js_1.default)
    );
    exports2.lineDiff = new LineDiff();
    function diffLines(oldStr, newStr, options) {
      return exports2.lineDiff.diff(oldStr, newStr, options);
    }
    function diffTrimmedLines(oldStr, newStr, options) {
      options = (0, params_js_1.generateOptions)(options, { ignoreWhitespace: true });
      return exports2.lineDiff.diff(oldStr, newStr, options);
    }
    function tokenize(value, options) {
      if (options.stripTrailingCr) {
        value = value.replace(/\r\n/g, "\n");
      }
      var retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
      if (!linesAndNewlines[linesAndNewlines.length - 1]) {
        linesAndNewlines.pop();
      }
      for (var i = 0; i < linesAndNewlines.length; i++) {
        var line = linesAndNewlines[i];
        if (i % 2 && !options.newlineIsToken) {
          retLines[retLines.length - 1] += line;
        } else {
          retLines.push(line);
        }
      }
      return retLines;
    }
  }
});

// node_modules/diff/libcjs/diff/sentence.js
var require_sentence = __commonJS({
  "node_modules/diff/libcjs/diff/sentence.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sentenceDiff = void 0;
    exports2.diffSentences = diffSentences;
    var base_js_1 = require_base();
    function isSentenceEndPunct(char) {
      return char == "." || char == "!" || char == "?";
    }
    var SentenceDiff = (
      /** @class */
      (function(_super) {
        __extends(SentenceDiff2, _super);
        function SentenceDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        SentenceDiff2.prototype.tokenize = function(value) {
          var _a;
          var result = [];
          var tokenStartI = 0;
          for (var i = 0; i < value.length; i++) {
            if (i == value.length - 1) {
              result.push(value.slice(tokenStartI));
              break;
            }
            if (isSentenceEndPunct(value[i]) && value[i + 1].match(/\s/)) {
              result.push(value.slice(tokenStartI, i + 1));
              i = tokenStartI = i + 1;
              while ((_a = value[i + 1]) === null || _a === void 0 ? void 0 : _a.match(/\s/)) {
                i++;
              }
              result.push(value.slice(tokenStartI, i + 1));
              tokenStartI = i + 1;
            }
          }
          return result;
        };
        return SentenceDiff2;
      })(base_js_1.default)
    );
    exports2.sentenceDiff = new SentenceDiff();
    function diffSentences(oldStr, newStr, options) {
      return exports2.sentenceDiff.diff(oldStr, newStr, options);
    }
  }
});

// node_modules/diff/libcjs/diff/css.js
var require_css = __commonJS({
  "node_modules/diff/libcjs/diff/css.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.cssDiff = void 0;
    exports2.diffCss = diffCss;
    var base_js_1 = require_base();
    var CssDiff = (
      /** @class */
      (function(_super) {
        __extends(CssDiff2, _super);
        function CssDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        CssDiff2.prototype.tokenize = function(value) {
          return value.split(/([{}:;,]|\s+)/);
        };
        return CssDiff2;
      })(base_js_1.default)
    );
    exports2.cssDiff = new CssDiff();
    function diffCss(oldStr, newStr, options) {
      return exports2.cssDiff.diff(oldStr, newStr, options);
    }
  }
});

// node_modules/diff/libcjs/diff/json.js
var require_json = __commonJS({
  "node_modules/diff/libcjs/diff/json.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.jsonDiff = void 0;
    exports2.diffJson = diffJson;
    exports2.canonicalize = canonicalize;
    var base_js_1 = require_base();
    var line_js_1 = require_line();
    var JsonDiff = (
      /** @class */
      (function(_super) {
        __extends(JsonDiff2, _super);
        function JsonDiff2() {
          var _this = _super !== null && _super.apply(this, arguments) || this;
          _this.tokenize = line_js_1.tokenize;
          return _this;
        }
        Object.defineProperty(JsonDiff2.prototype, "useLongestToken", {
          get: function() {
            return true;
          },
          enumerable: false,
          configurable: true
        });
        JsonDiff2.prototype.castInput = function(value, options) {
          var undefinedReplacement = options.undefinedReplacement, _a = options.stringifyReplacer, stringifyReplacer = _a === void 0 ? function(k, v) {
            return typeof v === "undefined" ? undefinedReplacement : v;
          } : _a;
          return typeof value === "string" ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), null, "  ");
        };
        JsonDiff2.prototype.equals = function(left, right, options) {
          return _super.prototype.equals.call(this, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"), options);
        };
        return JsonDiff2;
      })(base_js_1.default)
    );
    exports2.jsonDiff = new JsonDiff();
    function diffJson(oldStr, newStr, options) {
      return exports2.jsonDiff.diff(oldStr, newStr, options);
    }
    function canonicalize(obj, stack, replacementStack, replacer, key2) {
      stack = stack || [];
      replacementStack = replacementStack || [];
      if (replacer) {
        obj = replacer(key2 === void 0 ? "" : key2, obj);
      }
      var i;
      for (i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
          return replacementStack[i];
        }
      }
      var canonicalizedObj;
      if ("[object Array]" === Object.prototype.toString.call(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (i = 0; i < obj.length; i += 1) {
          canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, String(i));
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
      }
      if (obj && obj.toJSON) {
        obj = obj.toJSON();
      }
      if (typeof obj === "object" && obj !== null) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        var sortedKeys = [];
        var key_1;
        for (key_1 in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key_1)) {
            sortedKeys.push(key_1);
          }
        }
        sortedKeys.sort();
        for (i = 0; i < sortedKeys.length; i += 1) {
          key_1 = sortedKeys[i];
          canonicalizedObj[key_1] = canonicalize(obj[key_1], stack, replacementStack, replacer, key_1);
        }
        stack.pop();
        replacementStack.pop();
      } else {
        canonicalizedObj = obj;
      }
      return canonicalizedObj;
    }
  }
});

// node_modules/diff/libcjs/diff/array.js
var require_array = __commonJS({
  "node_modules/diff/libcjs/diff/array.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.arrayDiff = void 0;
    exports2.diffArrays = diffArrays;
    var base_js_1 = require_base();
    var ArrayDiff = (
      /** @class */
      (function(_super) {
        __extends(ArrayDiff2, _super);
        function ArrayDiff2() {
          return _super !== null && _super.apply(this, arguments) || this;
        }
        ArrayDiff2.prototype.tokenize = function(value) {
          return value.slice();
        };
        ArrayDiff2.prototype.join = function(value) {
          return value;
        };
        ArrayDiff2.prototype.removeEmpty = function(value) {
          return value;
        };
        return ArrayDiff2;
      })(base_js_1.default)
    );
    exports2.arrayDiff = new ArrayDiff();
    function diffArrays(oldArr, newArr, options) {
      return exports2.arrayDiff.diff(oldArr, newArr, options);
    }
  }
});

// node_modules/diff/libcjs/patch/line-endings.js
var require_line_endings = __commonJS({
  "node_modules/diff/libcjs/patch/line-endings.js"(exports2) {
    "use strict";
    var __assign = exports2 && exports2.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.unixToWin = unixToWin;
    exports2.winToUnix = winToUnix;
    exports2.isUnix = isUnix;
    exports2.isWin = isWin;
    function unixToWin(patch) {
      if (Array.isArray(patch)) {
        return patch.map(function(p) {
          return unixToWin(p);
        });
      }
      return __assign(__assign({}, patch), { hunks: patch.hunks.map(function(hunk) {
        return __assign(__assign({}, hunk), { lines: hunk.lines.map(function(line, i) {
          var _a;
          return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\")) ? line : line + "\r";
        }) });
      }) });
    }
    function winToUnix(patch) {
      if (Array.isArray(patch)) {
        return patch.map(function(p) {
          return winToUnix(p);
        });
      }
      return __assign(__assign({}, patch), { hunks: patch.hunks.map(function(hunk) {
        return __assign(__assign({}, hunk), { lines: hunk.lines.map(function(line) {
          return line.endsWith("\r") ? line.substring(0, line.length - 1) : line;
        }) });
      }) });
    }
    function isUnix(patch) {
      if (!Array.isArray(patch)) {
        patch = [patch];
      }
      return !patch.some(function(index) {
        return index.hunks.some(function(hunk) {
          return hunk.lines.some(function(line) {
            return !line.startsWith("\\") && line.endsWith("\r");
          });
        });
      });
    }
    function isWin(patch) {
      if (!Array.isArray(patch)) {
        patch = [patch];
      }
      return patch.some(function(index) {
        return index.hunks.some(function(hunk) {
          return hunk.lines.some(function(line) {
            return line.endsWith("\r");
          });
        });
      }) && patch.every(function(index) {
        return index.hunks.every(function(hunk) {
          return hunk.lines.every(function(line, i) {
            var _a;
            return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"));
          });
        });
      });
    }
  }
});

// node_modules/diff/libcjs/patch/parse.js
var require_parse = __commonJS({
  "node_modules/diff/libcjs/patch/parse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parsePatch = parsePatch;
    function parsePatch(uniDiff) {
      var diffstr = uniDiff.split(/\n/), list = [];
      var i = 0;
      function parseIndex() {
        var index = {};
        list.push(index);
        while (i < diffstr.length) {
          var line = diffstr[i];
          if (/^(---|\+\+\+|@@)\s/.test(line)) {
            break;
          }
          var headerMatch = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(line);
          if (headerMatch) {
            index.index = line.substring(headerMatch[0].length).trim();
          }
          i++;
        }
        parseFileHeader(index);
        parseFileHeader(index);
        index.hunks = [];
        while (i < diffstr.length) {
          var line = diffstr[i];
          if (/^(Index:\s|diff\s|---\s|\+\+\+\s|===================================================================)/.test(line)) {
            break;
          } else if (/^@@/.test(line)) {
            index.hunks.push(parseHunk());
          } else if (line) {
            throw new Error("Unknown line " + (i + 1) + " " + JSON.stringify(line));
          } else {
            i++;
          }
        }
      }
      function parseFileHeader(index) {
        var fileHeaderMatch = /^(---|\+\+\+)\s+/.exec(diffstr[i]);
        if (fileHeaderMatch) {
          var prefix = fileHeaderMatch[1], data = diffstr[i].substring(3).trim().split("	", 2), header = (data[1] || "").trim();
          var fileName = data[0].replace(/\\\\/g, "\\");
          if (fileName.startsWith('"') && fileName.endsWith('"')) {
            fileName = fileName.substr(1, fileName.length - 2);
          }
          if (prefix === "---") {
            index.oldFileName = fileName;
            index.oldHeader = header;
          } else {
            index.newFileName = fileName;
            index.newHeader = header;
          }
          i++;
        }
      }
      function parseHunk() {
        var _a;
        var chunkHeaderIndex = i, chunkHeaderLine = diffstr[i++], chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        var hunk = {
          oldStart: +chunkHeader[1],
          oldLines: typeof chunkHeader[2] === "undefined" ? 1 : +chunkHeader[2],
          newStart: +chunkHeader[3],
          newLines: typeof chunkHeader[4] === "undefined" ? 1 : +chunkHeader[4],
          lines: []
        };
        if (hunk.oldLines === 0) {
          hunk.oldStart += 1;
        }
        if (hunk.newLines === 0) {
          hunk.newStart += 1;
        }
        var addCount = 0, removeCount = 0;
        for (; i < diffstr.length && (removeCount < hunk.oldLines || addCount < hunk.newLines || ((_a = diffstr[i]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"))); i++) {
          var operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? " " : diffstr[i][0];
          if (operation === "+" || operation === "-" || operation === " " || operation === "\\") {
            hunk.lines.push(diffstr[i]);
            if (operation === "+") {
              addCount++;
            } else if (operation === "-") {
              removeCount++;
            } else if (operation === " ") {
              addCount++;
              removeCount++;
            }
          } else {
            throw new Error("Hunk at line ".concat(chunkHeaderIndex + 1, " contained invalid line ").concat(diffstr[i]));
          }
        }
        if (!addCount && hunk.newLines === 1) {
          hunk.newLines = 0;
        }
        if (!removeCount && hunk.oldLines === 1) {
          hunk.oldLines = 0;
        }
        if (addCount !== hunk.newLines) {
          throw new Error("Added line count did not match for hunk at line " + (chunkHeaderIndex + 1));
        }
        if (removeCount !== hunk.oldLines) {
          throw new Error("Removed line count did not match for hunk at line " + (chunkHeaderIndex + 1));
        }
        return hunk;
      }
      while (i < diffstr.length) {
        parseIndex();
      }
      return list;
    }
  }
});

// node_modules/diff/libcjs/util/distance-iterator.js
var require_distance_iterator = __commonJS({
  "node_modules/diff/libcjs/util/distance-iterator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = default_1;
    function default_1(start, minLine, maxLine) {
      var wantForward = true, backwardExhausted = false, forwardExhausted = false, localOffset = 1;
      return function iterator() {
        if (wantForward && !forwardExhausted) {
          if (backwardExhausted) {
            localOffset++;
          } else {
            wantForward = false;
          }
          if (start + localOffset <= maxLine) {
            return start + localOffset;
          }
          forwardExhausted = true;
        }
        if (!backwardExhausted) {
          if (!forwardExhausted) {
            wantForward = true;
          }
          if (minLine <= start - localOffset) {
            return start - localOffset++;
          }
          backwardExhausted = true;
          return iterator();
        }
        return void 0;
      };
    }
  }
});

// node_modules/diff/libcjs/patch/apply.js
var require_apply = __commonJS({
  "node_modules/diff/libcjs/patch/apply.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applyPatch = applyPatch;
    exports2.applyPatches = applyPatches;
    var string_js_1 = require_string();
    var line_endings_js_1 = require_line_endings();
    var parse_js_1 = require_parse();
    var distance_iterator_js_1 = require_distance_iterator();
    function applyPatch(source, patch, options) {
      if (options === void 0) {
        options = {};
      }
      var patches;
      if (typeof patch === "string") {
        patches = (0, parse_js_1.parsePatch)(patch);
      } else if (Array.isArray(patch)) {
        patches = patch;
      } else {
        patches = [patch];
      }
      if (patches.length > 1) {
        throw new Error("applyPatch only works with a single input.");
      }
      return applyStructuredPatch(source, patches[0], options);
    }
    function applyStructuredPatch(source, patch, options) {
      if (options === void 0) {
        options = {};
      }
      if (options.autoConvertLineEndings || options.autoConvertLineEndings == null) {
        if ((0, string_js_1.hasOnlyWinLineEndings)(source) && (0, line_endings_js_1.isUnix)(patch)) {
          patch = (0, line_endings_js_1.unixToWin)(patch);
        } else if ((0, string_js_1.hasOnlyUnixLineEndings)(source) && (0, line_endings_js_1.isWin)(patch)) {
          patch = (0, line_endings_js_1.winToUnix)(patch);
        }
      }
      var lines = source.split("\n"), hunks = patch.hunks, compareLine = options.compareLine || (function(lineNumber, line2, operation, patchContent) {
        return line2 === patchContent;
      }), fuzzFactor = options.fuzzFactor || 0;
      var minLine = 0;
      if (fuzzFactor < 0 || !Number.isInteger(fuzzFactor)) {
        throw new Error("fuzzFactor must be a non-negative integer");
      }
      if (!hunks.length) {
        return source;
      }
      var prevLine = "", removeEOFNL = false, addEOFNL = false;
      for (var i = 0; i < hunks[hunks.length - 1].lines.length; i++) {
        var line = hunks[hunks.length - 1].lines[i];
        if (line[0] == "\\") {
          if (prevLine[0] == "+") {
            removeEOFNL = true;
          } else if (prevLine[0] == "-") {
            addEOFNL = true;
          }
        }
        prevLine = line;
      }
      if (removeEOFNL) {
        if (addEOFNL) {
          if (!fuzzFactor && lines[lines.length - 1] == "") {
            return false;
          }
        } else if (lines[lines.length - 1] == "") {
          lines.pop();
        } else if (!fuzzFactor) {
          return false;
        }
      } else if (addEOFNL) {
        if (lines[lines.length - 1] != "") {
          lines.push("");
        } else if (!fuzzFactor) {
          return false;
        }
      }
      function applyHunk(hunkLines, toPos2, maxErrors2, hunkLinesI, lastContextLineMatched, patchedLines, patchedLinesLength) {
        if (hunkLinesI === void 0) {
          hunkLinesI = 0;
        }
        if (lastContextLineMatched === void 0) {
          lastContextLineMatched = true;
        }
        if (patchedLines === void 0) {
          patchedLines = [];
        }
        if (patchedLinesLength === void 0) {
          patchedLinesLength = 0;
        }
        var nConsecutiveOldContextLines = 0;
        var nextContextLineMustMatch = false;
        for (; hunkLinesI < hunkLines.length; hunkLinesI++) {
          var hunkLine = hunkLines[hunkLinesI], operation = hunkLine.length > 0 ? hunkLine[0] : " ", content = hunkLine.length > 0 ? hunkLine.substr(1) : hunkLine;
          if (operation === "-") {
            if (compareLine(toPos2 + 1, lines[toPos2], operation, content)) {
              toPos2++;
              nConsecutiveOldContextLines = 0;
            } else {
              if (!maxErrors2 || lines[toPos2] == null) {
                return null;
              }
              patchedLines[patchedLinesLength] = lines[toPos2];
              return applyHunk(hunkLines, toPos2 + 1, maxErrors2 - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1);
            }
          }
          if (operation === "+") {
            if (!lastContextLineMatched) {
              return null;
            }
            patchedLines[patchedLinesLength] = content;
            patchedLinesLength++;
            nConsecutiveOldContextLines = 0;
            nextContextLineMustMatch = true;
          }
          if (operation === " ") {
            nConsecutiveOldContextLines++;
            patchedLines[patchedLinesLength] = lines[toPos2];
            if (compareLine(toPos2 + 1, lines[toPos2], operation, content)) {
              patchedLinesLength++;
              lastContextLineMatched = true;
              nextContextLineMustMatch = false;
              toPos2++;
            } else {
              if (nextContextLineMustMatch || !maxErrors2) {
                return null;
              }
              return lines[toPos2] && (applyHunk(hunkLines, toPos2 + 1, maxErrors2 - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength + 1) || applyHunk(hunkLines, toPos2 + 1, maxErrors2 - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1)) || applyHunk(hunkLines, toPos2, maxErrors2 - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength);
            }
          }
        }
        patchedLinesLength -= nConsecutiveOldContextLines;
        toPos2 -= nConsecutiveOldContextLines;
        patchedLines.length = patchedLinesLength;
        return {
          patchedLines,
          oldLineLastI: toPos2 - 1
        };
      }
      var resultLines = [];
      var prevHunkOffset = 0;
      for (var i = 0; i < hunks.length; i++) {
        var hunk = hunks[i];
        var hunkResult = void 0;
        var maxLine = lines.length - hunk.oldLines + fuzzFactor;
        var toPos = void 0;
        for (var maxErrors = 0; maxErrors <= fuzzFactor; maxErrors++) {
          toPos = hunk.oldStart + prevHunkOffset - 1;
          var iterator = (0, distance_iterator_js_1.default)(toPos, minLine, maxLine);
          for (; toPos !== void 0; toPos = iterator()) {
            hunkResult = applyHunk(hunk.lines, toPos, maxErrors);
            if (hunkResult) {
              break;
            }
          }
          if (hunkResult) {
            break;
          }
        }
        if (!hunkResult) {
          return false;
        }
        for (var i_1 = minLine; i_1 < toPos; i_1++) {
          resultLines.push(lines[i_1]);
        }
        for (var i_2 = 0; i_2 < hunkResult.patchedLines.length; i_2++) {
          var line = hunkResult.patchedLines[i_2];
          resultLines.push(line);
        }
        minLine = hunkResult.oldLineLastI + 1;
        prevHunkOffset = toPos + 1 - hunk.oldStart;
      }
      for (var i = minLine; i < lines.length; i++) {
        resultLines.push(lines[i]);
      }
      return resultLines.join("\n");
    }
    function applyPatches(uniDiff, options) {
      var spDiff = typeof uniDiff === "string" ? (0, parse_js_1.parsePatch)(uniDiff) : uniDiff;
      var currentIndex = 0;
      function processIndex() {
        var index = spDiff[currentIndex++];
        if (!index) {
          return options.complete();
        }
        options.loadFile(index, function(err, data) {
          if (err) {
            return options.complete(err);
          }
          var updatedContent = applyPatch(data, index, options);
          options.patched(index, updatedContent, function(err2) {
            if (err2) {
              return options.complete(err2);
            }
            processIndex();
          });
        });
      }
      processIndex();
    }
  }
});

// node_modules/diff/libcjs/patch/reverse.js
var require_reverse = __commonJS({
  "node_modules/diff/libcjs/patch/reverse.js"(exports2) {
    "use strict";
    var __assign = exports2 && exports2.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.reversePatch = reversePatch;
    function reversePatch(structuredPatch) {
      if (Array.isArray(structuredPatch)) {
        return structuredPatch.map(function(patch) {
          return reversePatch(patch);
        }).reverse();
      }
      return __assign(__assign({}, structuredPatch), { oldFileName: structuredPatch.newFileName, oldHeader: structuredPatch.newHeader, newFileName: structuredPatch.oldFileName, newHeader: structuredPatch.oldHeader, hunks: structuredPatch.hunks.map(function(hunk) {
        return {
          oldLines: hunk.newLines,
          oldStart: hunk.newStart,
          newLines: hunk.oldLines,
          newStart: hunk.oldStart,
          lines: hunk.lines.map(function(l) {
            if (l.startsWith("-")) {
              return "+".concat(l.slice(1));
            }
            if (l.startsWith("+")) {
              return "-".concat(l.slice(1));
            }
            return l;
          })
        };
      }) });
    }
  }
});

// node_modules/diff/libcjs/patch/create.js
var require_create = __commonJS({
  "node_modules/diff/libcjs/patch/create.js"(exports2) {
    "use strict";
    var __assign = exports2 && exports2.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OMIT_HEADERS = exports2.FILE_HEADERS_ONLY = exports2.INCLUDE_HEADERS = void 0;
    exports2.structuredPatch = structuredPatch;
    exports2.formatPatch = formatPatch;
    exports2.createTwoFilesPatch = createTwoFilesPatch;
    exports2.createPatch = createPatch;
    var line_js_1 = require_line();
    exports2.INCLUDE_HEADERS = {
      includeIndex: true,
      includeUnderline: true,
      includeFileHeaders: true
    };
    exports2.FILE_HEADERS_ONLY = {
      includeIndex: false,
      includeUnderline: false,
      includeFileHeaders: true
    };
    exports2.OMIT_HEADERS = {
      includeIndex: false,
      includeUnderline: false,
      includeFileHeaders: false
    };
    function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
      var optionsObj;
      if (!options) {
        optionsObj = {};
      } else if (typeof options === "function") {
        optionsObj = { callback: options };
      } else {
        optionsObj = options;
      }
      if (typeof optionsObj.context === "undefined") {
        optionsObj.context = 4;
      }
      var context = optionsObj.context;
      if (optionsObj.newlineIsToken) {
        throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
      }
      if (!optionsObj.callback) {
        return diffLinesResultToPatch((0, line_js_1.diffLines)(oldStr, newStr, optionsObj));
      } else {
        var callback_1 = optionsObj.callback;
        (0, line_js_1.diffLines)(oldStr, newStr, __assign(__assign({}, optionsObj), { callback: function(diff) {
          var patch = diffLinesResultToPatch(diff);
          callback_1(patch);
        } }));
      }
      function diffLinesResultToPatch(diff) {
        if (!diff) {
          return;
        }
        diff.push({ value: "", lines: [] });
        function contextLines(lines2) {
          return lines2.map(function(entry) {
            return " " + entry;
          });
        }
        var hunks = [];
        var oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
        for (var i = 0; i < diff.length; i++) {
          var current = diff[i], lines = current.lines || splitLines(current.value);
          current.lines = lines;
          if (current.added || current.removed) {
            if (!oldRangeStart) {
              var prev = diff[i - 1];
              oldRangeStart = oldLine;
              newRangeStart = newLine;
              if (prev) {
                curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
                oldRangeStart -= curRange.length;
                newRangeStart -= curRange.length;
              }
            }
            for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
              var line = lines_1[_i];
              curRange.push((current.added ? "+" : "-") + line);
            }
            if (current.added) {
              newLine += lines.length;
            } else {
              oldLine += lines.length;
            }
          } else {
            if (oldRangeStart) {
              if (lines.length <= context * 2 && i < diff.length - 2) {
                for (var _a = 0, _b = contextLines(lines); _a < _b.length; _a++) {
                  var line = _b[_a];
                  curRange.push(line);
                }
              } else {
                var contextSize = Math.min(lines.length, context);
                for (var _c = 0, _d = contextLines(lines.slice(0, contextSize)); _c < _d.length; _c++) {
                  var line = _d[_c];
                  curRange.push(line);
                }
                var hunk = {
                  oldStart: oldRangeStart,
                  oldLines: oldLine - oldRangeStart + contextSize,
                  newStart: newRangeStart,
                  newLines: newLine - newRangeStart + contextSize,
                  lines: curRange
                };
                hunks.push(hunk);
                oldRangeStart = 0;
                newRangeStart = 0;
                curRange = [];
              }
            }
            oldLine += lines.length;
            newLine += lines.length;
          }
        }
        for (var _e = 0, hunks_1 = hunks; _e < hunks_1.length; _e++) {
          var hunk = hunks_1[_e];
          for (var i = 0; i < hunk.lines.length; i++) {
            if (hunk.lines[i].endsWith("\n")) {
              hunk.lines[i] = hunk.lines[i].slice(0, -1);
            } else {
              hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
              i++;
            }
          }
        }
        return {
          oldFileName,
          newFileName,
          oldHeader,
          newHeader,
          hunks
        };
      }
    }
    function formatPatch(patch, headerOptions) {
      if (!headerOptions) {
        headerOptions = exports2.INCLUDE_HEADERS;
      }
      if (Array.isArray(patch)) {
        if (patch.length > 1 && !headerOptions.includeFileHeaders) {
          throw new Error("Cannot omit file headers on a multi-file patch. (The result would be unparseable; how would a tool trying to apply the patch know which changes are to which file?)");
        }
        return patch.map(function(p) {
          return formatPatch(p, headerOptions);
        }).join("\n");
      }
      var ret = [];
      if (headerOptions.includeIndex && patch.oldFileName == patch.newFileName) {
        ret.push("Index: " + patch.oldFileName);
      }
      if (headerOptions.includeUnderline) {
        ret.push("===================================================================");
      }
      if (headerOptions.includeFileHeaders) {
        ret.push("--- " + patch.oldFileName + (typeof patch.oldHeader === "undefined" ? "" : "	" + patch.oldHeader));
        ret.push("+++ " + patch.newFileName + (typeof patch.newHeader === "undefined" ? "" : "	" + patch.newHeader));
      }
      for (var i = 0; i < patch.hunks.length; i++) {
        var hunk = patch.hunks[i];
        if (hunk.oldLines === 0) {
          hunk.oldStart -= 1;
        }
        if (hunk.newLines === 0) {
          hunk.newStart -= 1;
        }
        ret.push("@@ -" + hunk.oldStart + "," + hunk.oldLines + " +" + hunk.newStart + "," + hunk.newLines + " @@");
        for (var _i = 0, _a = hunk.lines; _i < _a.length; _i++) {
          var line = _a[_i];
          ret.push(line);
        }
      }
      return ret.join("\n") + "\n";
    }
    function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
      if (typeof options === "function") {
        options = { callback: options };
      }
      if (!(options === null || options === void 0 ? void 0 : options.callback)) {
        var patchObj = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
        if (!patchObj) {
          return;
        }
        return formatPatch(patchObj, options === null || options === void 0 ? void 0 : options.headerOptions);
      } else {
        var callback_2 = options.callback;
        structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, __assign(__assign({}, options), { callback: function(patchObj2) {
          if (!patchObj2) {
            callback_2(void 0);
          } else {
            callback_2(formatPatch(patchObj2, options.headerOptions));
          }
        } }));
      }
    }
    function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
      return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
    }
    function splitLines(text) {
      var hasTrailingNl = text.endsWith("\n");
      var result = text.split("\n").map(function(line) {
        return line + "\n";
      });
      if (hasTrailingNl) {
        result.pop();
      } else {
        result.push(result.pop().slice(0, -1));
      }
      return result;
    }
  }
});

// node_modules/diff/libcjs/convert/dmp.js
var require_dmp = __commonJS({
  "node_modules/diff/libcjs/convert/dmp.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.convertChangesToDMP = convertChangesToDMP;
    function convertChangesToDMP(changes) {
      var ret = [];
      var change, operation;
      for (var i = 0; i < changes.length; i++) {
        change = changes[i];
        if (change.added) {
          operation = 1;
        } else if (change.removed) {
          operation = -1;
        } else {
          operation = 0;
        }
        ret.push([operation, change.value]);
      }
      return ret;
    }
  }
});

// node_modules/diff/libcjs/convert/xml.js
var require_xml = __commonJS({
  "node_modules/diff/libcjs/convert/xml.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.convertChangesToXML = convertChangesToXML;
    function convertChangesToXML(changes) {
      var ret = [];
      for (var i = 0; i < changes.length; i++) {
        var change = changes[i];
        if (change.added) {
          ret.push("<ins>");
        } else if (change.removed) {
          ret.push("<del>");
        }
        ret.push(escapeHTML(change.value));
        if (change.added) {
          ret.push("</ins>");
        } else if (change.removed) {
          ret.push("</del>");
        }
      }
      return ret.join("");
    }
    function escapeHTML(s) {
      var n = s;
      n = n.replace(/&/g, "&amp;");
      n = n.replace(/</g, "&lt;");
      n = n.replace(/>/g, "&gt;");
      n = n.replace(/"/g, "&quot;");
      return n;
    }
  }
});

// node_modules/diff/libcjs/index.js
var require_libcjs = __commonJS({
  "node_modules/diff/libcjs/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.canonicalize = exports2.convertChangesToXML = exports2.convertChangesToDMP = exports2.reversePatch = exports2.parsePatch = exports2.applyPatches = exports2.applyPatch = exports2.OMIT_HEADERS = exports2.FILE_HEADERS_ONLY = exports2.INCLUDE_HEADERS = exports2.formatPatch = exports2.createPatch = exports2.createTwoFilesPatch = exports2.structuredPatch = exports2.arrayDiff = exports2.diffArrays = exports2.jsonDiff = exports2.diffJson = exports2.cssDiff = exports2.diffCss = exports2.sentenceDiff = exports2.diffSentences = exports2.diffTrimmedLines = exports2.lineDiff = exports2.diffLines = exports2.wordsWithSpaceDiff = exports2.diffWordsWithSpace = exports2.wordDiff = exports2.diffWords = exports2.characterDiff = exports2.diffChars = exports2.Diff = void 0;
    var base_js_1 = require_base();
    exports2.Diff = base_js_1.default;
    var character_js_1 = require_character();
    Object.defineProperty(exports2, "diffChars", { enumerable: true, get: function() {
      return character_js_1.diffChars;
    } });
    Object.defineProperty(exports2, "characterDiff", { enumerable: true, get: function() {
      return character_js_1.characterDiff;
    } });
    var word_js_1 = require_word();
    Object.defineProperty(exports2, "diffWords", { enumerable: true, get: function() {
      return word_js_1.diffWords;
    } });
    Object.defineProperty(exports2, "diffWordsWithSpace", { enumerable: true, get: function() {
      return word_js_1.diffWordsWithSpace;
    } });
    Object.defineProperty(exports2, "wordDiff", { enumerable: true, get: function() {
      return word_js_1.wordDiff;
    } });
    Object.defineProperty(exports2, "wordsWithSpaceDiff", { enumerable: true, get: function() {
      return word_js_1.wordsWithSpaceDiff;
    } });
    var line_js_1 = require_line();
    Object.defineProperty(exports2, "diffLines", { enumerable: true, get: function() {
      return line_js_1.diffLines;
    } });
    Object.defineProperty(exports2, "diffTrimmedLines", { enumerable: true, get: function() {
      return line_js_1.diffTrimmedLines;
    } });
    Object.defineProperty(exports2, "lineDiff", { enumerable: true, get: function() {
      return line_js_1.lineDiff;
    } });
    var sentence_js_1 = require_sentence();
    Object.defineProperty(exports2, "diffSentences", { enumerable: true, get: function() {
      return sentence_js_1.diffSentences;
    } });
    Object.defineProperty(exports2, "sentenceDiff", { enumerable: true, get: function() {
      return sentence_js_1.sentenceDiff;
    } });
    var css_js_1 = require_css();
    Object.defineProperty(exports2, "diffCss", { enumerable: true, get: function() {
      return css_js_1.diffCss;
    } });
    Object.defineProperty(exports2, "cssDiff", { enumerable: true, get: function() {
      return css_js_1.cssDiff;
    } });
    var json_js_1 = require_json();
    Object.defineProperty(exports2, "diffJson", { enumerable: true, get: function() {
      return json_js_1.diffJson;
    } });
    Object.defineProperty(exports2, "canonicalize", { enumerable: true, get: function() {
      return json_js_1.canonicalize;
    } });
    Object.defineProperty(exports2, "jsonDiff", { enumerable: true, get: function() {
      return json_js_1.jsonDiff;
    } });
    var array_js_1 = require_array();
    Object.defineProperty(exports2, "diffArrays", { enumerable: true, get: function() {
      return array_js_1.diffArrays;
    } });
    Object.defineProperty(exports2, "arrayDiff", { enumerable: true, get: function() {
      return array_js_1.arrayDiff;
    } });
    var apply_js_1 = require_apply();
    Object.defineProperty(exports2, "applyPatch", { enumerable: true, get: function() {
      return apply_js_1.applyPatch;
    } });
    Object.defineProperty(exports2, "applyPatches", { enumerable: true, get: function() {
      return apply_js_1.applyPatches;
    } });
    var parse_js_1 = require_parse();
    Object.defineProperty(exports2, "parsePatch", { enumerable: true, get: function() {
      return parse_js_1.parsePatch;
    } });
    var reverse_js_1 = require_reverse();
    Object.defineProperty(exports2, "reversePatch", { enumerable: true, get: function() {
      return reverse_js_1.reversePatch;
    } });
    var create_js_1 = require_create();
    Object.defineProperty(exports2, "structuredPatch", { enumerable: true, get: function() {
      return create_js_1.structuredPatch;
    } });
    Object.defineProperty(exports2, "createTwoFilesPatch", { enumerable: true, get: function() {
      return create_js_1.createTwoFilesPatch;
    } });
    Object.defineProperty(exports2, "createPatch", { enumerable: true, get: function() {
      return create_js_1.createPatch;
    } });
    Object.defineProperty(exports2, "formatPatch", { enumerable: true, get: function() {
      return create_js_1.formatPatch;
    } });
    Object.defineProperty(exports2, "INCLUDE_HEADERS", { enumerable: true, get: function() {
      return create_js_1.INCLUDE_HEADERS;
    } });
    Object.defineProperty(exports2, "FILE_HEADERS_ONLY", { enumerable: true, get: function() {
      return create_js_1.FILE_HEADERS_ONLY;
    } });
    Object.defineProperty(exports2, "OMIT_HEADERS", { enumerable: true, get: function() {
      return create_js_1.OMIT_HEADERS;
    } });
    var dmp_js_1 = require_dmp();
    Object.defineProperty(exports2, "convertChangesToDMP", { enumerable: true, get: function() {
      return dmp_js_1.convertChangesToDMP;
    } });
    var xml_js_1 = require_xml();
    Object.defineProperty(exports2, "convertChangesToXML", { enumerable: true, get: function() {
      return xml_js_1.convertChangesToXML;
    } });
  }
});

// node_modules/diff2html/lib/rematch.js
var require_rematch = __commonJS({
  "node_modules/diff2html/lib/rematch.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.levenshtein = levenshtein;
    exports2.newDistanceFn = newDistanceFn;
    exports2.newMatcherFn = newMatcherFn;
    function levenshtein(a, b) {
      if (a.length === 0) {
        return b.length;
      }
      if (b.length === 0) {
        return a.length;
      }
      const matrix = [];
      let i;
      for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      let j;
      for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
          }
        }
      }
      return matrix[b.length][a.length];
    }
    function newDistanceFn(str) {
      return (x, y) => {
        const xValue = str(x).trim();
        const yValue = str(y).trim();
        const lev = levenshtein(xValue, yValue);
        return lev / (xValue.length + yValue.length);
      };
    }
    function newMatcherFn(distance) {
      function findBestMatch(a, b, cache = /* @__PURE__ */ new Map()) {
        let bestMatchDist = Infinity;
        let bestMatch;
        for (let i = 0; i < a.length; ++i) {
          for (let j = 0; j < b.length; ++j) {
            const cacheKey = JSON.stringify([a[i], b[j]]);
            let md;
            if (!(cache.has(cacheKey) && (md = cache.get(cacheKey)))) {
              md = distance(a[i], b[j]);
              cache.set(cacheKey, md);
            }
            if (md < bestMatchDist) {
              bestMatchDist = md;
              bestMatch = { indexA: i, indexB: j, score: bestMatchDist };
            }
          }
        }
        return bestMatch;
      }
      function group(a, b, level = 0, cache = /* @__PURE__ */ new Map()) {
        const bm = findBestMatch(a, b, cache);
        if (!bm || a.length + b.length < 3) {
          return [[a, b]];
        }
        const a1 = a.slice(0, bm.indexA);
        const b1 = b.slice(0, bm.indexB);
        const aMatch = [a[bm.indexA]];
        const bMatch = [b[bm.indexB]];
        const tailA = bm.indexA + 1;
        const tailB = bm.indexB + 1;
        const a2 = a.slice(tailA);
        const b2 = b.slice(tailB);
        const group1 = group(a1, b1, level + 1, cache);
        const groupMatch = group(aMatch, bMatch, level + 1, cache);
        const group2 = group(a2, b2, level + 1, cache);
        let result = groupMatch;
        if (bm.indexA > 0 || bm.indexB > 0) {
          result = group1.concat(result);
        }
        if (a.length > tailA || b.length > tailB) {
          result = result.concat(group2);
        }
        return result;
      }
      return group;
    }
  }
});

// node_modules/diff2html/lib/render-utils.js
var require_render_utils = __commonJS({
  "node_modules/diff2html/lib/render-utils.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultRenderConfig = exports2.CSSLineClass = void 0;
    exports2.toCSSClass = toCSSClass;
    exports2.colorSchemeToCss = colorSchemeToCss;
    exports2.escapeForHtml = escapeForHtml;
    exports2.deconstructLine = deconstructLine;
    exports2.filenameDiff = filenameDiff;
    exports2.getHtmlId = getHtmlId;
    exports2.getFileIcon = getFileIcon;
    exports2.diffHighlight = diffHighlight;
    var jsDiff = __importStar(require_libcjs());
    var utils_1 = require_utils();
    var rematch = __importStar(require_rematch());
    var types_1 = require_types();
    exports2.CSSLineClass = {
      INSERTS: "d2h-ins",
      DELETES: "d2h-del",
      CONTEXT: "d2h-cntx",
      INFO: "d2h-info",
      INSERT_CHANGES: "d2h-ins d2h-change",
      DELETE_CHANGES: "d2h-del d2h-change"
    };
    exports2.defaultRenderConfig = {
      matching: types_1.LineMatchingType.NONE,
      matchWordsThreshold: 0.25,
      maxLineLengthHighlight: 1e4,
      diffStyle: types_1.DiffStyleType.WORD,
      colorScheme: types_1.ColorSchemeType.LIGHT
    };
    var separator = "/";
    var distance = rematch.newDistanceFn((change) => change.value);
    var matcher = rematch.newMatcherFn(distance);
    function isDevNullName(name) {
      return name.indexOf("dev/null") !== -1;
    }
    function removeInsElements(line) {
      return line.replace(/(<ins[^>]*>((.|\n)*?)<\/ins>)/g, "");
    }
    function removeDelElements(line) {
      return line.replace(/(<del[^>]*>((.|\n)*?)<\/del>)/g, "");
    }
    function toCSSClass(lineType) {
      switch (lineType) {
        case types_1.LineType.CONTEXT:
          return exports2.CSSLineClass.CONTEXT;
        case types_1.LineType.INSERT:
          return exports2.CSSLineClass.INSERTS;
        case types_1.LineType.DELETE:
          return exports2.CSSLineClass.DELETES;
      }
    }
    function colorSchemeToCss(colorScheme) {
      switch (colorScheme) {
        case types_1.ColorSchemeType.DARK:
          return "d2h-dark-color-scheme";
        case types_1.ColorSchemeType.AUTO:
          return "d2h-auto-color-scheme";
        case types_1.ColorSchemeType.LIGHT:
        default:
          return "d2h-light-color-scheme";
      }
    }
    function prefixLength(isCombined) {
      return isCombined ? 2 : 1;
    }
    function escapeForHtml(str) {
      return str.slice(0).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
    }
    function deconstructLine(line, isCombined, escape = true) {
      const indexToSplit = prefixLength(isCombined);
      return {
        prefix: line.substring(0, indexToSplit),
        content: escape ? escapeForHtml(line.substring(indexToSplit)) : line.substring(indexToSplit)
      };
    }
    function filenameDiff(file) {
      const oldFilename = (0, utils_1.unifyPath)(file.oldName);
      const newFilename = (0, utils_1.unifyPath)(file.newName);
      if (oldFilename !== newFilename && !isDevNullName(oldFilename) && !isDevNullName(newFilename)) {
        const prefixPaths = [];
        const suffixPaths = [];
        const oldFilenameParts = oldFilename.split(separator);
        const newFilenameParts = newFilename.split(separator);
        const oldFilenamePartsSize = oldFilenameParts.length;
        const newFilenamePartsSize = newFilenameParts.length;
        let i = 0;
        let j = oldFilenamePartsSize - 1;
        let k = newFilenamePartsSize - 1;
        while (i < j && i < k) {
          if (oldFilenameParts[i] === newFilenameParts[i]) {
            prefixPaths.push(newFilenameParts[i]);
            i += 1;
          } else {
            break;
          }
        }
        while (j > i && k > i) {
          if (oldFilenameParts[j] === newFilenameParts[k]) {
            suffixPaths.unshift(newFilenameParts[k]);
            j -= 1;
            k -= 1;
          } else {
            break;
          }
        }
        const finalPrefix = prefixPaths.join(separator);
        const finalSuffix = suffixPaths.join(separator);
        const oldRemainingPath = oldFilenameParts.slice(i, j + 1).join(separator);
        const newRemainingPath = newFilenameParts.slice(i, k + 1).join(separator);
        if (finalPrefix.length && finalSuffix.length) {
          return finalPrefix + separator + "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}" + separator + finalSuffix;
        } else if (finalPrefix.length) {
          return finalPrefix + separator + "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}";
        } else if (finalSuffix.length) {
          return "{" + oldRemainingPath + " \u2192 " + newRemainingPath + "}" + separator + finalSuffix;
        }
        return oldFilename + " \u2192 " + newFilename;
      } else if (!isDevNullName(newFilename)) {
        return newFilename;
      } else {
        return oldFilename;
      }
    }
    function getHtmlId(file) {
      return `d2h-${(0, utils_1.hashCode)(filenameDiff(file)).toString().slice(-6)}`;
    }
    function getFileIcon(file) {
      let templateName = "file-changed";
      if (file.isRename) {
        templateName = "file-renamed";
      } else if (file.isCopy) {
        templateName = "file-renamed";
      } else if (file.isNew) {
        templateName = "file-added";
      } else if (file.isDeleted) {
        templateName = "file-deleted";
      } else if (file.newName !== file.oldName) {
        templateName = "file-renamed";
      }
      return templateName;
    }
    function diffHighlight(diffLine1, diffLine2, isCombined, config = {}) {
      const { matching, maxLineLengthHighlight, matchWordsThreshold, diffStyle } = Object.assign(Object.assign({}, exports2.defaultRenderConfig), config);
      const line1 = deconstructLine(diffLine1, isCombined, false);
      const line2 = deconstructLine(diffLine2, isCombined, false);
      if (line1.content.length > maxLineLengthHighlight || line2.content.length > maxLineLengthHighlight) {
        return {
          oldLine: {
            prefix: line1.prefix,
            content: escapeForHtml(line1.content)
          },
          newLine: {
            prefix: line2.prefix,
            content: escapeForHtml(line2.content)
          }
        };
      }
      const diff = diffStyle === "char" ? jsDiff.diffChars(line1.content, line2.content) : jsDiff.diffWordsWithSpace(line1.content, line2.content);
      const changedWords = [];
      if (diffStyle === "word" && matching === "words") {
        const removed = diff.filter((element) => element.removed);
        const added = diff.filter((element) => element.added);
        const chunks = matcher(added, removed);
        chunks.forEach((chunk) => {
          if (chunk[0].length === 1 && chunk[1].length === 1) {
            const dist = distance(chunk[0][0], chunk[1][0]);
            if (dist < matchWordsThreshold) {
              changedWords.push(chunk[0][0]);
              changedWords.push(chunk[1][0]);
            }
          }
        });
      }
      const highlightedLine = diff.reduce((highlightedLine2, part) => {
        const elemType = part.added ? "ins" : part.removed ? "del" : null;
        const addClass = changedWords.indexOf(part) > -1 ? ' class="d2h-change"' : "";
        const escapedValue = escapeForHtml(part.value);
        return elemType !== null ? `${highlightedLine2}<${elemType}${addClass}>${escapedValue}</${elemType}>` : `${highlightedLine2}${escapedValue}`;
      }, "");
      return {
        oldLine: {
          prefix: line1.prefix,
          content: removeInsElements(highlightedLine)
        },
        newLine: {
          prefix: line2.prefix,
          content: removeDelElements(highlightedLine)
        }
      };
    }
  }
});

// node_modules/diff2html/lib/file-list-renderer.js
var require_file_list_renderer = __commonJS({
  "node_modules/diff2html/lib/file-list-renderer.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileListRenderer = exports2.defaultFileListRendererConfig = void 0;
    var renderUtils = __importStar(require_render_utils());
    var baseTemplatesPath = "file-summary";
    var iconsBaseTemplatesPath = "icon";
    exports2.defaultFileListRendererConfig = {
      colorScheme: renderUtils.defaultRenderConfig.colorScheme
    };
    var FileListRenderer = class {
      constructor(hoganUtils, config = {}) {
        this.hoganUtils = hoganUtils;
        this.config = Object.assign(Object.assign({}, exports2.defaultFileListRendererConfig), config);
      }
      render(diffFiles) {
        const files = diffFiles.map((file) => this.hoganUtils.render(baseTemplatesPath, "line", {
          fileHtmlId: renderUtils.getHtmlId(file),
          oldName: file.oldName,
          newName: file.newName,
          fileName: renderUtils.filenameDiff(file),
          deletedLines: "-" + file.deletedLines,
          addedLines: "+" + file.addedLines
        }, {
          fileIcon: this.hoganUtils.template(iconsBaseTemplatesPath, renderUtils.getFileIcon(file))
        })).join("\n");
        return this.hoganUtils.render(baseTemplatesPath, "wrapper", {
          colorScheme: renderUtils.colorSchemeToCss(this.config.colorScheme),
          filesNumber: diffFiles.length,
          files
        });
      }
    };
    exports2.FileListRenderer = FileListRenderer;
  }
});

// node_modules/diff2html/lib/line-by-line-renderer.js
var require_line_by_line_renderer = __commonJS({
  "node_modules/diff2html/lib/line-by-line-renderer.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultLineByLineRendererConfig = void 0;
    var Rematch = __importStar(require_rematch());
    var renderUtils = __importStar(require_render_utils());
    var types_1 = require_types();
    var utils_1 = require_utils();
    exports2.defaultLineByLineRendererConfig = Object.assign(Object.assign({}, renderUtils.defaultRenderConfig), { renderNothingWhenEmpty: false, matchingMaxComparisons: 2500, maxLineSizeInBlockForComparison: 200 });
    var genericTemplatesPath = "generic";
    var baseTemplatesPath = "line-by-line";
    var iconsBaseTemplatesPath = "icon";
    var tagsBaseTemplatesPath = "tag";
    var LineByLineRenderer = class {
      constructor(hoganUtils, config = {}) {
        this.hoganUtils = hoganUtils;
        this.config = Object.assign(Object.assign({}, exports2.defaultLineByLineRendererConfig), config);
      }
      render(diffFiles) {
        const diffsHtml = diffFiles.map((file) => {
          let diffs;
          if (file.blocks.length) {
            diffs = this.generateFileHtml(file);
          } else {
            diffs = this.generateEmptyDiff();
          }
          return this.makeFileDiffHtml(file, diffs);
        }).join("\n");
        return this.hoganUtils.render(genericTemplatesPath, "wrapper", {
          colorScheme: renderUtils.colorSchemeToCss(this.config.colorScheme),
          content: diffsHtml
        });
      }
      makeFileDiffHtml(file, diffs) {
        if (this.config.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0)
          return "";
        const fileDiffTemplate = this.hoganUtils.template(baseTemplatesPath, "file-diff");
        const filePathTemplate = this.hoganUtils.template(genericTemplatesPath, "file-path");
        const fileIconTemplate = this.hoganUtils.template(iconsBaseTemplatesPath, "file");
        const fileTagTemplate = this.hoganUtils.template(tagsBaseTemplatesPath, renderUtils.getFileIcon(file));
        return fileDiffTemplate.render({
          file,
          fileHtmlId: renderUtils.getHtmlId(file),
          diffs,
          filePath: filePathTemplate.render({
            fileDiffName: renderUtils.filenameDiff(file)
          }, {
            fileIcon: fileIconTemplate,
            fileTag: fileTagTemplate
          })
        });
      }
      generateEmptyDiff() {
        return this.hoganUtils.render(genericTemplatesPath, "empty-diff", {
          contentClass: "d2h-code-line",
          CSSLineClass: renderUtils.CSSLineClass
        });
      }
      generateFileHtml(file) {
        const matcher = Rematch.newMatcherFn(Rematch.newDistanceFn((e) => renderUtils.deconstructLine(e.content, file.isCombined).content));
        return file.blocks.map((block) => {
          let lines = this.hoganUtils.render(genericTemplatesPath, "block-header", {
            CSSLineClass: renderUtils.CSSLineClass,
            blockHeader: file.isTooBig ? block.header : renderUtils.escapeForHtml(block.header),
            lineClass: "d2h-code-linenumber",
            contentClass: "d2h-code-line"
          });
          this.applyLineGroupping(block).forEach(([contextLines, oldLines, newLines]) => {
            if (oldLines.length && newLines.length && !contextLines.length) {
              this.applyRematchMatching(oldLines, newLines, matcher).map(([oldLines2, newLines2]) => {
                const { left, right } = this.processChangedLines(file, file.isCombined, oldLines2, newLines2);
                lines += left;
                lines += right;
              });
            } else if (contextLines.length) {
              contextLines.forEach((line) => {
                const { prefix, content } = renderUtils.deconstructLine(line.content, file.isCombined);
                lines += this.generateSingleLineHtml(file, {
                  type: renderUtils.CSSLineClass.CONTEXT,
                  prefix,
                  content,
                  oldNumber: line.oldNumber,
                  newNumber: line.newNumber
                });
              });
            } else if (oldLines.length || newLines.length) {
              const { left, right } = this.processChangedLines(file, file.isCombined, oldLines, newLines);
              lines += left;
              lines += right;
            } else {
              console.error("Unknown state reached while processing groups of lines", contextLines, oldLines, newLines);
            }
          });
          return lines;
        }).join("\n");
      }
      applyLineGroupping(block) {
        const blockLinesGroups = [];
        let oldLines = [];
        let newLines = [];
        for (let i = 0; i < block.lines.length; i++) {
          const diffLine = block.lines[i];
          if (diffLine.type !== types_1.LineType.INSERT && newLines.length || diffLine.type === types_1.LineType.CONTEXT && oldLines.length > 0) {
            blockLinesGroups.push([[], oldLines, newLines]);
            oldLines = [];
            newLines = [];
          }
          if (diffLine.type === types_1.LineType.CONTEXT) {
            blockLinesGroups.push([[diffLine], [], []]);
          } else if (diffLine.type === types_1.LineType.INSERT && oldLines.length === 0) {
            blockLinesGroups.push([[], [], [diffLine]]);
          } else if (diffLine.type === types_1.LineType.INSERT && oldLines.length > 0) {
            newLines.push(diffLine);
          } else if (diffLine.type === types_1.LineType.DELETE) {
            oldLines.push(diffLine);
          }
        }
        if (oldLines.length || newLines.length) {
          blockLinesGroups.push([[], oldLines, newLines]);
          oldLines = [];
          newLines = [];
        }
        return blockLinesGroups;
      }
      applyRematchMatching(oldLines, newLines, matcher) {
        const comparisons = oldLines.length * newLines.length;
        const maxLineSizeInBlock = (0, utils_1.max)(oldLines.concat(newLines).map((elem) => elem.content.length));
        const doMatching = comparisons < this.config.matchingMaxComparisons && maxLineSizeInBlock < this.config.maxLineSizeInBlockForComparison && (this.config.matching === "lines" || this.config.matching === "words");
        return doMatching ? matcher(oldLines, newLines) : [[oldLines, newLines]];
      }
      processChangedLines(file, isCombined, oldLines, newLines) {
        const fileHtml = {
          right: "",
          left: ""
        };
        const maxLinesNumber = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLinesNumber; i++) {
          const oldLine = oldLines[i];
          const newLine = newLines[i];
          const diff = oldLine !== void 0 && newLine !== void 0 ? renderUtils.diffHighlight(oldLine.content, newLine.content, isCombined, this.config) : void 0;
          const preparedOldLine = oldLine !== void 0 && oldLine.oldNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
            prefix: diff.oldLine.prefix,
            content: diff.oldLine.content,
            type: renderUtils.CSSLineClass.DELETE_CHANGES
          } : Object.assign(Object.assign({}, renderUtils.deconstructLine(oldLine.content, isCombined)), { type: renderUtils.toCSSClass(oldLine.type) })), { oldNumber: oldLine.oldNumber, newNumber: oldLine.newNumber }) : void 0;
          const preparedNewLine = newLine !== void 0 && newLine.newNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
            prefix: diff.newLine.prefix,
            content: diff.newLine.content,
            type: renderUtils.CSSLineClass.INSERT_CHANGES
          } : Object.assign(Object.assign({}, renderUtils.deconstructLine(newLine.content, isCombined)), { type: renderUtils.toCSSClass(newLine.type) })), { oldNumber: newLine.oldNumber, newNumber: newLine.newNumber }) : void 0;
          const { left, right } = this.generateLineHtml(file, preparedOldLine, preparedNewLine);
          fileHtml.left += left;
          fileHtml.right += right;
        }
        return fileHtml;
      }
      generateLineHtml(file, oldLine, newLine) {
        return {
          left: this.generateSingleLineHtml(file, oldLine),
          right: this.generateSingleLineHtml(file, newLine)
        };
      }
      generateSingleLineHtml(file, line) {
        if (line === void 0)
          return "";
        const lineNumberHtml = this.hoganUtils.render(baseTemplatesPath, "numbers", {
          oldNumber: line.oldNumber || "",
          newNumber: line.newNumber || ""
        });
        return this.hoganUtils.render(genericTemplatesPath, "line", {
          type: line.type,
          lineClass: "d2h-code-linenumber",
          contentClass: "d2h-code-line",
          prefix: line.prefix === " " ? "&nbsp;" : line.prefix,
          content: line.content,
          lineNumber: lineNumberHtml,
          line,
          file
        });
      }
    };
    exports2.default = LineByLineRenderer;
  }
});

// node_modules/diff2html/lib/side-by-side-renderer.js
var require_side_by_side_renderer = __commonJS({
  "node_modules/diff2html/lib/side-by-side-renderer.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultSideBySideRendererConfig = void 0;
    var Rematch = __importStar(require_rematch());
    var renderUtils = __importStar(require_render_utils());
    var types_1 = require_types();
    var utils_1 = require_utils();
    exports2.defaultSideBySideRendererConfig = Object.assign(Object.assign({}, renderUtils.defaultRenderConfig), { renderNothingWhenEmpty: false, matchingMaxComparisons: 2500, maxLineSizeInBlockForComparison: 200 });
    var genericTemplatesPath = "generic";
    var baseTemplatesPath = "side-by-side";
    var iconsBaseTemplatesPath = "icon";
    var tagsBaseTemplatesPath = "tag";
    var SideBySideRenderer = class {
      constructor(hoganUtils, config = {}) {
        this.hoganUtils = hoganUtils;
        this.config = Object.assign(Object.assign({}, exports2.defaultSideBySideRendererConfig), config);
      }
      render(diffFiles) {
        const diffsHtml = diffFiles.map((file) => {
          let diffs;
          if (file.blocks.length) {
            diffs = this.generateFileHtml(file);
          } else {
            diffs = this.generateEmptyDiff();
          }
          return this.makeFileDiffHtml(file, diffs);
        }).join("\n");
        return this.hoganUtils.render(genericTemplatesPath, "wrapper", {
          colorScheme: renderUtils.colorSchemeToCss(this.config.colorScheme),
          content: diffsHtml
        });
      }
      makeFileDiffHtml(file, diffs) {
        if (this.config.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0)
          return "";
        const fileDiffTemplate = this.hoganUtils.template(baseTemplatesPath, "file-diff");
        const filePathTemplate = this.hoganUtils.template(genericTemplatesPath, "file-path");
        const fileIconTemplate = this.hoganUtils.template(iconsBaseTemplatesPath, "file");
        const fileTagTemplate = this.hoganUtils.template(tagsBaseTemplatesPath, renderUtils.getFileIcon(file));
        return fileDiffTemplate.render({
          file,
          fileHtmlId: renderUtils.getHtmlId(file),
          diffs,
          filePath: filePathTemplate.render({
            fileDiffName: renderUtils.filenameDiff(file)
          }, {
            fileIcon: fileIconTemplate,
            fileTag: fileTagTemplate
          })
        });
      }
      generateEmptyDiff() {
        return {
          right: "",
          left: this.hoganUtils.render(genericTemplatesPath, "empty-diff", {
            contentClass: "d2h-code-side-line",
            CSSLineClass: renderUtils.CSSLineClass
          })
        };
      }
      generateFileHtml(file) {
        const matcher = Rematch.newMatcherFn(Rematch.newDistanceFn((e) => renderUtils.deconstructLine(e.content, file.isCombined).content));
        return file.blocks.map((block) => {
          const fileHtml = {
            left: this.makeHeaderHtml(block.header, file),
            right: this.makeHeaderHtml("")
          };
          this.applyLineGroupping(block).forEach(([contextLines, oldLines, newLines]) => {
            if (oldLines.length && newLines.length && !contextLines.length) {
              this.applyRematchMatching(oldLines, newLines, matcher).map(([oldLines2, newLines2]) => {
                const { left, right } = this.processChangedLines(file.isCombined, oldLines2, newLines2);
                fileHtml.left += left;
                fileHtml.right += right;
              });
            } else if (contextLines.length) {
              contextLines.forEach((line) => {
                const { prefix, content } = renderUtils.deconstructLine(line.content, file.isCombined);
                const { left, right } = this.generateLineHtml({
                  type: renderUtils.CSSLineClass.CONTEXT,
                  prefix,
                  content,
                  number: line.oldNumber
                }, {
                  type: renderUtils.CSSLineClass.CONTEXT,
                  prefix,
                  content,
                  number: line.newNumber
                });
                fileHtml.left += left;
                fileHtml.right += right;
              });
            } else if (oldLines.length || newLines.length) {
              const { left, right } = this.processChangedLines(file.isCombined, oldLines, newLines);
              fileHtml.left += left;
              fileHtml.right += right;
            } else {
              console.error("Unknown state reached while processing groups of lines", contextLines, oldLines, newLines);
            }
          });
          return fileHtml;
        }).reduce((accomulated, html) => {
          return { left: accomulated.left + html.left, right: accomulated.right + html.right };
        }, { left: "", right: "" });
      }
      applyLineGroupping(block) {
        const blockLinesGroups = [];
        let oldLines = [];
        let newLines = [];
        for (let i = 0; i < block.lines.length; i++) {
          const diffLine = block.lines[i];
          if (diffLine.type !== types_1.LineType.INSERT && newLines.length || diffLine.type === types_1.LineType.CONTEXT && oldLines.length > 0) {
            blockLinesGroups.push([[], oldLines, newLines]);
            oldLines = [];
            newLines = [];
          }
          if (diffLine.type === types_1.LineType.CONTEXT) {
            blockLinesGroups.push([[diffLine], [], []]);
          } else if (diffLine.type === types_1.LineType.INSERT && oldLines.length === 0) {
            blockLinesGroups.push([[], [], [diffLine]]);
          } else if (diffLine.type === types_1.LineType.INSERT && oldLines.length > 0) {
            newLines.push(diffLine);
          } else if (diffLine.type === types_1.LineType.DELETE) {
            oldLines.push(diffLine);
          }
        }
        if (oldLines.length || newLines.length) {
          blockLinesGroups.push([[], oldLines, newLines]);
          oldLines = [];
          newLines = [];
        }
        return blockLinesGroups;
      }
      applyRematchMatching(oldLines, newLines, matcher) {
        const comparisons = oldLines.length * newLines.length;
        const maxLineSizeInBlock = (0, utils_1.max)(oldLines.concat(newLines).map((elem) => elem.content.length));
        const doMatching = comparisons < this.config.matchingMaxComparisons && maxLineSizeInBlock < this.config.maxLineSizeInBlockForComparison && (this.config.matching === "lines" || this.config.matching === "words");
        return doMatching ? matcher(oldLines, newLines) : [[oldLines, newLines]];
      }
      makeHeaderHtml(blockHeader, file) {
        return this.hoganUtils.render(genericTemplatesPath, "block-header", {
          CSSLineClass: renderUtils.CSSLineClass,
          blockHeader: (file === null || file === void 0 ? void 0 : file.isTooBig) ? blockHeader : renderUtils.escapeForHtml(blockHeader),
          lineClass: "d2h-code-side-linenumber",
          contentClass: "d2h-code-side-line"
        });
      }
      processChangedLines(isCombined, oldLines, newLines) {
        const fileHtml = {
          right: "",
          left: ""
        };
        const maxLinesNumber = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLinesNumber; i++) {
          const oldLine = oldLines[i];
          const newLine = newLines[i];
          const diff = oldLine !== void 0 && newLine !== void 0 ? renderUtils.diffHighlight(oldLine.content, newLine.content, isCombined, this.config) : void 0;
          const preparedOldLine = oldLine !== void 0 && oldLine.oldNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
            prefix: diff.oldLine.prefix,
            content: diff.oldLine.content,
            type: renderUtils.CSSLineClass.DELETE_CHANGES
          } : Object.assign(Object.assign({}, renderUtils.deconstructLine(oldLine.content, isCombined)), { type: renderUtils.toCSSClass(oldLine.type) })), { number: oldLine.oldNumber }) : void 0;
          const preparedNewLine = newLine !== void 0 && newLine.newNumber !== void 0 ? Object.assign(Object.assign({}, diff !== void 0 ? {
            prefix: diff.newLine.prefix,
            content: diff.newLine.content,
            type: renderUtils.CSSLineClass.INSERT_CHANGES
          } : Object.assign(Object.assign({}, renderUtils.deconstructLine(newLine.content, isCombined)), { type: renderUtils.toCSSClass(newLine.type) })), { number: newLine.newNumber }) : void 0;
          const { left, right } = this.generateLineHtml(preparedOldLine, preparedNewLine);
          fileHtml.left += left;
          fileHtml.right += right;
        }
        return fileHtml;
      }
      generateLineHtml(oldLine, newLine) {
        return {
          left: this.generateSingleHtml(oldLine),
          right: this.generateSingleHtml(newLine)
        };
      }
      generateSingleHtml(line) {
        const lineClass = "d2h-code-side-linenumber";
        const contentClass = "d2h-code-side-line";
        return this.hoganUtils.render(genericTemplatesPath, "line", {
          type: (line === null || line === void 0 ? void 0 : line.type) || `${renderUtils.CSSLineClass.CONTEXT} d2h-emptyplaceholder`,
          lineClass: line !== void 0 ? lineClass : `${lineClass} d2h-code-side-emptyplaceholder`,
          contentClass: line !== void 0 ? contentClass : `${contentClass} d2h-code-side-emptyplaceholder`,
          prefix: (line === null || line === void 0 ? void 0 : line.prefix) === " " ? "&nbsp;" : line === null || line === void 0 ? void 0 : line.prefix,
          content: line === null || line === void 0 ? void 0 : line.content,
          lineNumber: line === null || line === void 0 ? void 0 : line.number
        });
      }
    };
    exports2.default = SideBySideRenderer;
  }
});

// node_modules/@profoundlogic/hogan/lib/compiler.js
var require_compiler = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/compiler.js"(exports2) {
    (function(Hogan2) {
      var rIsWhitespace = /\S/, rQuot = /\"/g, rNewline = /\n/g, rCr = /\r/g, rSlash = /\\/g, rLineSep = /\u2028/, rParagraphSep = /\u2029/;
      Hogan2.tags = {
        "#": 1,
        "^": 2,
        "<": 3,
        "$": 4,
        "/": 5,
        "!": 6,
        ">": 7,
        "=": 8,
        "_v": 9,
        "{": 10,
        "&": 11,
        "_t": 12
      };
      Hogan2.scan = function scan(text, delimiters) {
        var len = text.length, IN_TEXT = 0, IN_TAG_TYPE = 1, IN_TAG = 2, state = IN_TEXT, tagType = null, tag = null, buf = "", tokens = [], seenTag = false, i = 0, lineStart = 0, otag = "{{", ctag = "}}";
        function addBuf() {
          if (buf.length > 0) {
            tokens.push({ tag: "_t", text: new String(buf) });
            buf = "";
          }
        }
        function lineIsWhitespace() {
          var isAllWhitespace = true;
          for (var j = lineStart; j < tokens.length; j++) {
            isAllWhitespace = Hogan2.tags[tokens[j].tag] < Hogan2.tags["_v"] || tokens[j].tag == "_t" && tokens[j].text.match(rIsWhitespace) === null;
            if (!isAllWhitespace) {
              return false;
            }
          }
          return isAllWhitespace;
        }
        function filterLine(haveSeenTag, noNewLine) {
          addBuf();
          if (haveSeenTag && lineIsWhitespace()) {
            for (var j = lineStart, next; j < tokens.length; j++) {
              if (tokens[j].text) {
                if ((next = tokens[j + 1]) && next.tag == ">") {
                  next.indent = tokens[j].text.toString();
                }
                tokens.splice(j, 1);
              }
            }
          } else if (!noNewLine) {
            tokens.push({ tag: "\n" });
          }
          seenTag = false;
          lineStart = tokens.length;
        }
        function changeDelimiters(text2, index) {
          var close = "=" + ctag, closeIndex = text2.indexOf(close, index), delimiters2 = trim(
            text2.substring(text2.indexOf("=", index) + 1, closeIndex)
          ).split(" ");
          otag = delimiters2[0];
          ctag = delimiters2[delimiters2.length - 1];
          return closeIndex + close.length - 1;
        }
        if (delimiters) {
          delimiters = delimiters.split(" ");
          otag = delimiters[0];
          ctag = delimiters[1];
        }
        for (i = 0; i < len; i++) {
          if (state == IN_TEXT) {
            if (tagChange(otag, text, i)) {
              --i;
              addBuf();
              state = IN_TAG_TYPE;
            } else {
              if (text.charAt(i) == "\n") {
                filterLine(seenTag);
              } else {
                buf += text.charAt(i);
              }
            }
          } else if (state == IN_TAG_TYPE) {
            i += otag.length - 1;
            tag = Hogan2.tags[text.charAt(i + 1)];
            tagType = tag ? text.charAt(i + 1) : "_v";
            if (tagType == "=") {
              i = changeDelimiters(text, i);
              state = IN_TEXT;
            } else {
              if (tag) {
                i++;
              }
              state = IN_TAG;
            }
            seenTag = i;
          } else {
            if (tagChange(ctag, text, i)) {
              tokens.push({
                tag: tagType,
                n: trim(buf),
                otag,
                ctag,
                i: tagType == "/" ? seenTag - otag.length : i + ctag.length
              });
              buf = "";
              i += ctag.length - 1;
              state = IN_TEXT;
              if (tagType == "{") {
                if (ctag == "}}") {
                  i++;
                } else {
                  cleanTripleStache(tokens[tokens.length - 1]);
                }
              }
            } else {
              buf += text.charAt(i);
            }
          }
        }
        filterLine(seenTag, true);
        return tokens;
      };
      function cleanTripleStache(token) {
        if (token.n.substr(token.n.length - 1) === "}") {
          token.n = token.n.substring(0, token.n.length - 1);
        }
      }
      function trim(s) {
        if (s.trim) {
          return s.trim();
        }
        return s.replace(/^\s*|\s*$/g, "");
      }
      function tagChange(tag, text, index) {
        if (text.charAt(index) != tag.charAt(0)) {
          return false;
        }
        for (var i = 1, l = tag.length; i < l; i++) {
          if (text.charAt(index + i) != tag.charAt(i)) {
            return false;
          }
        }
        return true;
      }
      var allowedInSuper = { "_t": true, "\n": true, "$": true, "/": true };
      function buildTree(tokens, kind, stack, customTags) {
        var instructions = [], opener = null, tail = null, token = null;
        tail = stack[stack.length - 1];
        while (tokens.length > 0) {
          token = tokens.shift();
          if (tail && tail.tag == "<" && !(token.tag in allowedInSuper)) {
            throw new Error("Illegal content in < super tag.");
          }
          if (Hogan2.tags[token.tag] <= Hogan2.tags["$"] || isOpener(token, customTags)) {
            stack.push(token);
            token.nodes = buildTree(tokens, token.tag, stack, customTags);
          } else if (token.tag == "/") {
            if (stack.length === 0) {
              throw new Error("Closing tag without opener: /" + token.n);
            }
            opener = stack.pop();
            if (token.n != opener.n && !isCloser(token.n, opener.n, customTags)) {
              throw new Error("Nesting error: " + opener.n + " vs. " + token.n);
            }
            opener.end = token.i;
            return instructions;
          } else if (token.tag == "\n") {
            token.last = tokens.length == 0 || tokens[0].tag == "\n";
          }
          instructions.push(token);
        }
        if (stack.length > 0) {
          throw new Error("missing closing tag: " + stack.pop().n);
        }
        return instructions;
      }
      function isOpener(token, tags) {
        for (var i = 0, l = tags.length; i < l; i++) {
          if (tags[i].o == token.n) {
            token.tag = "#";
            return true;
          }
        }
      }
      function isCloser(close, open, tags) {
        for (var i = 0, l = tags.length; i < l; i++) {
          if (tags[i].c == close && tags[i].o == open) {
            return true;
          }
        }
      }
      function stringifySubstitutions(obj) {
        var items = [];
        for (var key2 in obj) {
          items.push('"' + esc(key2) + '": function(c,p,t,i) {' + obj[key2] + "}");
        }
        return "{ " + items.join(",") + " }";
      }
      function stringifyPartials(codeObj) {
        var partials = [];
        for (var key2 in codeObj.partials) {
          partials.push('"' + esc(key2) + '":{name:"' + esc(codeObj.partials[key2].name) + '", ' + stringifyPartials(codeObj.partials[key2]) + "}");
        }
        return "partials: {" + partials.join(",") + "}, subs: " + stringifySubstitutions(codeObj.subs);
      }
      Hogan2.stringify = function(codeObj, text, options) {
        return "{code: function (c,p,i) { " + Hogan2.wrapMain(codeObj.code) + " }," + stringifyPartials(codeObj) + "}";
      };
      var serialNo = 0;
      Hogan2.generate = function(tree, text, options) {
        serialNo = 0;
        var context = { code: "", subs: {}, partials: {} };
        Hogan2.walk(tree, context);
        if (options.asString) {
          return this.stringify(context, text, options);
        }
        return this.makeTemplate(context, text, options);
      };
      Hogan2.wrapMain = function(code) {
        return 'var t=this;t.b(i=i||"");' + code + "return t.fl();";
      };
      Hogan2.template = Hogan2.Template;
      Hogan2.makeTemplate = function(codeObj, text, options) {
        var template = this.makePartials(codeObj);
        template.code = new Function("c", "p", "i", this.wrapMain(codeObj.code));
        return new this.template(template, text, this, options);
      };
      Hogan2.makePartials = function(codeObj) {
        var key2, template = { subs: {}, partials: codeObj.partials, name: codeObj.name };
        for (key2 in template.partials) {
          template.partials[key2] = this.makePartials(template.partials[key2]);
        }
        for (key2 in codeObj.subs) {
          template.subs[key2] = new Function("c", "p", "t", "i", codeObj.subs[key2]);
        }
        return template;
      };
      function esc(s) {
        return s.replace(rSlash, "\\\\").replace(rQuot, '\\"').replace(rNewline, "\\n").replace(rCr, "\\r").replace(rLineSep, "\\u2028").replace(rParagraphSep, "\\u2029");
      }
      function chooseMethod(s) {
        return ~s.indexOf(".") ? "d" : "f";
      }
      function createPartial(node, context) {
        var prefix = "<" + (context.prefix || "");
        var sym = prefix + node.n + serialNo++;
        context.partials[sym] = { name: node.n, partials: {} };
        context.code += 't.b(t.rp("' + esc(sym) + '",c,p,"' + (node.indent || "") + '"));';
        return sym;
      }
      Hogan2.codegen = {
        "#": function(node, context) {
          context.code += "if(t.s(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),c,p,0,' + node.i + "," + node.end + ',"' + node.otag + " " + node.ctag + '")){t.rs(c,p,function(c,p,t){';
          Hogan2.walk(node.nodes, context);
          context.code += "});c.pop();}";
        },
        "^": function(node, context) {
          context.code += "if(!t.s(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,1),c,p,1,0,0,"")){';
          Hogan2.walk(node.nodes, context);
          context.code += "};";
        },
        ">": createPartial,
        "<": function(node, context) {
          var ctx = { partials: {}, code: "", subs: {}, inPartial: true };
          Hogan2.walk(node.nodes, ctx);
          var template = context.partials[createPartial(node, context)];
          template.subs = ctx.subs;
          template.partials = ctx.partials;
        },
        "$": function(node, context) {
          var ctx = { subs: {}, code: "", partials: context.partials, prefix: node.n };
          Hogan2.walk(node.nodes, ctx);
          context.subs[node.n] = ctx.code;
          if (!context.inPartial) {
            context.code += 't.sub("' + esc(node.n) + '",c,p,i);';
          }
        },
        "\n": function(node, context) {
          context.code += write('"\\n"' + (node.last ? "" : " + i"));
        },
        "_v": function(node, context) {
          context.code += "t.b(t.v(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
        },
        "_t": function(node, context) {
          context.code += write('"' + esc(node.text) + '"');
        },
        "{": tripleStache,
        "&": tripleStache
      };
      function tripleStache(node, context) {
        context.code += "t.b(t.t(t." + chooseMethod(node.n) + '("' + esc(node.n) + '",c,p,0)));';
      }
      function write(s) {
        return "t.b(" + s + ");";
      }
      Hogan2.walk = function(nodelist, context) {
        var func;
        for (var i = 0, l = nodelist.length; i < l; i++) {
          func = Hogan2.codegen[nodelist[i].tag];
          func && func(nodelist[i], context);
        }
        return context;
      };
      Hogan2.parse = function(tokens, text, options) {
        options = options || {};
        return buildTree(tokens, "", [], options.sectionTags || []);
      };
      Hogan2.cache = {};
      Hogan2.cacheKey = function(text, options) {
        return [text, !!options.asString, !!options.disableLambda, options.delimiters, !!options.modelGet].join("||");
      };
      Hogan2.compile = function(text, options) {
        options = options || {};
        var key2 = Hogan2.cacheKey(text, options);
        var template = this.cache[key2];
        if (template) {
          var partials = template.partials;
          for (var name in partials) {
            delete partials[name].instance;
          }
          return template;
        }
        template = this.generate(this.parse(this.scan(text, options.delimiters), text, options), text, options);
        return this.cache[key2] = template;
      };
    })(typeof exports2 !== "undefined" ? exports2 : Hogan);
  }
});

// node_modules/@profoundlogic/hogan/lib/template.js
var require_template = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/template.js"(exports2) {
    var Hogan2 = {};
    (function(Hogan3) {
      Hogan3.Template = function(codeObj, text, compiler, options) {
        codeObj = codeObj || {};
        this.r = codeObj.code || this.r;
        this.c = compiler;
        this.options = options || {};
        this.text = text || "";
        this.partials = codeObj.partials || {};
        this.subs = codeObj.subs || {};
        this.buf = "";
      };
      Hogan3.Template.prototype = {
        // render: replaced by generated code.
        r: function(context, partials, indent) {
          return "";
        },
        // variable escaping
        v: hoganEscape,
        // triple stache
        t: coerceToString,
        render: function render(context, partials, indent) {
          return this.ri([context], partials || {}, indent);
        },
        // render internal -- a hook for overrides that catches partials too
        ri: function(context, partials, indent) {
          return this.r(context, partials, indent);
        },
        // ensurePartial
        ep: function(symbol, partials) {
          var partial = this.partials[symbol];
          var template = partials[partial.name];
          if (partial.instance && partial.base == template) {
            return partial.instance;
          }
          if (typeof template == "string") {
            if (!this.c) {
              throw new Error("No compiler available.");
            }
            template = this.c.compile(template, this.options);
          }
          if (!template) {
            return null;
          }
          this.partials[symbol].base = template;
          if (partial.subs) {
            if (!partials.stackText) partials.stackText = {};
            for (key in partial.subs) {
              if (!partials.stackText[key]) {
                partials.stackText[key] = this.activeSub !== void 0 && partials.stackText[this.activeSub] ? partials.stackText[this.activeSub] : this.text;
              }
            }
            template = createSpecializedPartial(
              template,
              partial.subs,
              partial.partials,
              this.stackSubs,
              this.stackPartials,
              partials.stackText
            );
          }
          this.partials[symbol].instance = template;
          return template;
        },
        // tries to find a partial in the current scope and render it
        rp: function(symbol, context, partials, indent) {
          var partial = this.ep(symbol, partials);
          if (!partial) {
            return "";
          }
          return partial.ri(context, partials, indent);
        },
        // render a section
        rs: function(context, partials, section) {
          var tail = context[context.length - 1];
          if (!isArray(tail)) {
            section(context, partials, this);
            return;
          }
          for (var i = 0; i < tail.length; i++) {
            context.push(tail[i]);
            section(context, partials, this);
            context.pop();
          }
        },
        // maybe start a section
        s: function(val, ctx, partials, inverted, start, end, tags) {
          var pass;
          if (isArray(val) && val.length === 0) {
            return false;
          }
          if (typeof val == "function") {
            val = this.ms(val, ctx, partials, inverted, start, end, tags);
          }
          pass = !!val;
          if (!inverted && pass && ctx) {
            ctx.push(typeof val == "object" ? val : ctx[ctx.length - 1]);
          }
          return pass;
        },
        // find values with dotted names
        d: function(key2, ctx, partials, returnFound) {
          var found, names = key2.split("."), val = this.f(names[0], ctx, partials, returnFound), doModelGet = this.options.modelGet, cx = null;
          if (key2 === "." && isArray(ctx[ctx.length - 2])) {
            val = ctx[ctx.length - 1];
          } else {
            for (var i = 1; i < names.length; i++) {
              found = findInScope(names[i], val, doModelGet);
              if (found !== void 0) {
                cx = val;
                val = found;
              } else {
                val = "";
              }
            }
          }
          if (returnFound && !val) {
            return false;
          }
          if (!returnFound && typeof val == "function") {
            ctx.push(cx);
            val = this.mv(val, ctx, partials);
            ctx.pop();
          }
          return val;
        },
        // find values with normal names
        f: function(key2, ctx, partials, returnFound) {
          var val = false, v = null, found = false, doModelGet = this.options.modelGet;
          for (var i = ctx.length - 1; i >= 0; i--) {
            v = ctx[i];
            val = findInScope(key2, v, doModelGet);
            if (val !== void 0) {
              found = true;
              break;
            }
          }
          if (!found) {
            return returnFound ? false : "";
          }
          if (!returnFound && typeof val == "function") {
            val = this.mv(val, ctx, partials);
          }
          return val;
        },
        // higher order templates
        ls: function(func, cx, ctx, partials, text, tags) {
          var oldTags = this.options.delimiters;
          this.options.delimiters = tags;
          this.b(this.ct(coerceToString(func.call(cx, text, ctx)), cx, partials));
          this.options.delimiters = oldTags;
          return false;
        },
        // compile text
        ct: function(text, cx, partials) {
          if (this.options.disableLambda) {
            throw new Error("Lambda features disabled.");
          }
          return this.c.compile(text, this.options).render(cx, partials);
        },
        // template result buffering
        b: function(s) {
          this.buf += s;
        },
        fl: function() {
          var r = this.buf;
          this.buf = "";
          return r;
        },
        // method replace section
        ms: function(func, ctx, partials, inverted, start, end, tags) {
          var textSource, cx = ctx[ctx.length - 1], result = func.call(cx);
          if (typeof result == "function") {
            if (inverted) {
              return true;
            } else {
              textSource = this.activeSub && this.subsText && this.subsText[this.activeSub] ? this.subsText[this.activeSub] : this.text;
              return this.ls(result, cx, ctx, partials, textSource.substring(start, end), tags);
            }
          }
          return result;
        },
        // method replace variable
        mv: function(func, ctx, partials) {
          var cx = ctx[ctx.length - 1];
          var result = func.call(cx);
          if (typeof result == "function") {
            return this.ct(coerceToString(result.call(cx)), cx, partials);
          }
          return result;
        },
        sub: function(name, context, partials, indent) {
          var f = this.subs[name];
          if (f) {
            this.activeSub = name;
            f(context, partials, this, indent);
            this.activeSub = false;
          }
        }
      };
      function findInScope(key2, scope, doModelGet) {
        var val;
        if (scope && typeof scope == "object") {
          if (scope[key2] !== void 0) {
            val = scope[key2];
          } else if (doModelGet && scope.get && typeof scope.get == "function") {
            val = scope.get(key2);
          }
        }
        return val;
      }
      function createSpecializedPartial(instance, subs, partials, stackSubs, stackPartials, stackText) {
        function PartialTemplate() {
        }
        ;
        PartialTemplate.prototype = instance;
        function Substitutions() {
        }
        ;
        Substitutions.prototype = instance.subs;
        var key2;
        var partial = new PartialTemplate();
        partial.subs = new Substitutions();
        partial.subsText = {};
        partial.buf = "";
        stackSubs = stackSubs || {};
        partial.stackSubs = stackSubs;
        partial.subsText = stackText;
        for (key2 in subs) {
          if (!stackSubs[key2]) stackSubs[key2] = subs[key2];
        }
        for (key2 in stackSubs) {
          partial.subs[key2] = stackSubs[key2];
        }
        stackPartials = stackPartials || {};
        partial.stackPartials = stackPartials;
        for (key2 in partials) {
          if (!stackPartials[key2]) stackPartials[key2] = partials[key2];
        }
        for (key2 in stackPartials) {
          partial.partials[key2] = stackPartials[key2];
        }
        return partial;
      }
      var rAmp = /&/g, rLt = /</g, rGt = />/g, rApos = /\'/g, rQuot = /\"/g, hChars = /[&<>\"\']/;
      function coerceToString(val) {
        return String(val === null || val === void 0 ? "" : val);
      }
      function hoganEscape(str) {
        str = coerceToString(str);
        return hChars.test(str) ? str.replace(rAmp, "&amp;").replace(rLt, "&lt;").replace(rGt, "&gt;").replace(rApos, "&#39;").replace(rQuot, "&quot;") : str;
      }
      var isArray = Array.isArray || function(a) {
        return Object.prototype.toString.call(a) === "[object Array]";
      };
    })(typeof exports2 !== "undefined" ? exports2 : Hogan2);
  }
});

// node_modules/@profoundlogic/hogan/lib/hogan.js
var require_hogan = __commonJS({
  "node_modules/@profoundlogic/hogan/lib/hogan.js"(exports2, module2) {
    var Hogan2 = require_compiler();
    Hogan2.Template = require_template().Template;
    Hogan2.template = Hogan2.Template;
    module2.exports = Hogan2;
  }
});

// node_modules/diff2html/lib/diff2html-templates.js
var require_diff2html_templates = __commonJS({
  "node_modules/diff2html/lib/diff2html-templates.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultTemplates = void 0;
    var Hogan2 = __importStar(require_hogan());
    exports2.defaultTemplates = {};
    exports2.defaultTemplates["file-summary-line"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<li class="d2h-file-list-line">');
      t.b("\n" + i);
      t.b('    <span class="d2h-file-name-wrapper">');
      t.b("\n" + i);
      t.b(t.rp("<fileIcon0", c, p, "      "));
      t.b('      <a href="#');
      t.b(t.v(t.f("fileHtmlId", c, p, 0)));
      t.b('" class="d2h-file-name">');
      t.b(t.v(t.f("fileName", c, p, 0)));
      t.b("</a>");
      t.b("\n" + i);
      t.b('      <span class="d2h-file-stats">');
      t.b("\n" + i);
      t.b('          <span class="d2h-lines-added">');
      t.b(t.v(t.f("addedLines", c, p, 0)));
      t.b("</span>");
      t.b("\n" + i);
      t.b('          <span class="d2h-lines-deleted">');
      t.b(t.v(t.f("deletedLines", c, p, 0)));
      t.b("</span>");
      t.b("\n" + i);
      t.b("      </span>");
      t.b("\n" + i);
      t.b("    </span>");
      t.b("\n" + i);
      t.b("</li>");
      return t.fl();
    }, partials: { "<fileIcon0": { name: "fileIcon", partials: {}, subs: {} } }, subs: {} });
    exports2.defaultTemplates["file-summary-wrapper"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<div class="d2h-file-list-wrapper ');
      t.b(t.v(t.f("colorScheme", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('    <div class="d2h-file-list-header">');
      t.b("\n" + i);
      t.b('        <span class="d2h-file-list-title">Files changed (');
      t.b(t.v(t.f("filesNumber", c, p, 0)));
      t.b(")</span>");
      t.b("\n" + i);
      t.b('        <a class="d2h-file-switch d2h-hide">hide</a>');
      t.b("\n" + i);
      t.b('        <a class="d2h-file-switch d2h-show">show</a>');
      t.b("\n" + i);
      t.b("    </div>");
      t.b("\n" + i);
      t.b('    <ol class="d2h-file-list">');
      t.b("\n" + i);
      t.b("    ");
      t.b(t.t(t.f("files", c, p, 0)));
      t.b("\n" + i);
      t.b("    </ol>");
      t.b("\n" + i);
      t.b("</div>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["generic-block-header"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b("<tr>");
      t.b("\n" + i);
      t.b('    <td class="');
      t.b(t.v(t.f("lineClass", c, p, 0)));
      t.b(" ");
      t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
      t.b('"></td>');
      t.b("\n" + i);
      t.b('    <td class="');
      t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('        <div class="');
      t.b(t.v(t.f("contentClass", c, p, 0)));
      t.b('">');
      if (t.s(t.f("blockHeader", c, p, 1), c, p, 0, 156, 173, "{{ }}")) {
        t.rs(c, p, function(c2, p2, t2) {
          t2.b(t2.t(t2.f("blockHeader", c2, p2, 0)));
        });
        c.pop();
      }
      if (!t.s(t.f("blockHeader", c, p, 1), c, p, 1, 0, 0, "")) {
        t.b("&nbsp;");
      }
      ;
      t.b("</div>");
      t.b("\n" + i);
      t.b("    </td>");
      t.b("\n" + i);
      t.b("</tr>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["generic-empty-diff"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b("<tr>");
      t.b("\n" + i);
      t.b('    <td class="');
      t.b(t.v(t.d("CSSLineClass.INFO", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('        <div class="');
      t.b(t.v(t.f("contentClass", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b("            File without changes");
      t.b("\n" + i);
      t.b("        </div>");
      t.b("\n" + i);
      t.b("    </td>");
      t.b("\n" + i);
      t.b("</tr>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["generic-file-path"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<span class="d2h-file-name-wrapper">');
      t.b("\n" + i);
      t.b(t.rp("<fileIcon0", c, p, "    "));
      t.b('    <span class="d2h-file-name">');
      t.b(t.v(t.f("fileDiffName", c, p, 0)));
      t.b("</span>");
      t.b("\n" + i);
      t.b(t.rp("<fileTag1", c, p, "    "));
      t.b("</span>");
      t.b("\n" + i);
      t.b('<label class="d2h-file-collapse">');
      t.b("\n" + i);
      t.b('    <input class="d2h-file-collapse-input" type="checkbox" name="viewed" value="viewed">');
      t.b("\n" + i);
      t.b("    Viewed");
      t.b("\n" + i);
      t.b("</label>");
      return t.fl();
    }, partials: { "<fileIcon0": { name: "fileIcon", partials: {}, subs: {} }, "<fileTag1": { name: "fileTag", partials: {}, subs: {} } }, subs: {} });
    exports2.defaultTemplates["generic-line"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b("<tr>");
      t.b("\n" + i);
      t.b('    <td class="');
      t.b(t.v(t.f("lineClass", c, p, 0)));
      t.b(" ");
      t.b(t.v(t.f("type", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b("      ");
      t.b(t.t(t.f("lineNumber", c, p, 0)));
      t.b("\n" + i);
      t.b("    </td>");
      t.b("\n" + i);
      t.b('    <td class="');
      t.b(t.v(t.f("type", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('        <div class="');
      t.b(t.v(t.f("contentClass", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      if (t.s(t.f("prefix", c, p, 1), c, p, 0, 162, 238, "{{ }}")) {
        t.rs(c, p, function(c2, p2, t2) {
          t2.b('            <span class="d2h-code-line-prefix">');
          t2.b(t2.t(t2.f("prefix", c2, p2, 0)));
          t2.b("</span>");
          t2.b("\n" + i);
        });
        c.pop();
      }
      if (!t.s(t.f("prefix", c, p, 1), c, p, 1, 0, 0, "")) {
        t.b('            <span class="d2h-code-line-prefix">&nbsp;</span>');
        t.b("\n" + i);
      }
      ;
      if (t.s(t.f("content", c, p, 1), c, p, 0, 371, 445, "{{ }}")) {
        t.rs(c, p, function(c2, p2, t2) {
          t2.b('            <span class="d2h-code-line-ctn">');
          t2.b(t2.t(t2.f("content", c2, p2, 0)));
          t2.b("</span>");
          t2.b("\n" + i);
        });
        c.pop();
      }
      if (!t.s(t.f("content", c, p, 1), c, p, 1, 0, 0, "")) {
        t.b('            <span class="d2h-code-line-ctn"><br></span>');
        t.b("\n" + i);
      }
      ;
      t.b("        </div>");
      t.b("\n" + i);
      t.b("    </td>");
      t.b("\n" + i);
      t.b("</tr>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["generic-wrapper"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<div class="d2h-wrapper ');
      t.b(t.v(t.f("colorScheme", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b("    ");
      t.b(t.t(t.f("content", c, p, 0)));
      t.b("\n" + i);
      t.b("</div>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["icon-file-added"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<svg aria-hidden="true" class="d2h-icon d2h-added" height="16" title="added" version="1.1" viewBox="0 0 14 16"');
      t.b("\n" + i);
      t.b('     width="14">');
      t.b("\n" + i);
      t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM6 9H3V7h3V4h2v3h3v2H8v3H6V9z"></path>');
      t.b("\n" + i);
      t.b("</svg>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["icon-file-changed"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<svg aria-hidden="true" class="d2h-icon d2h-changed" height="16" title="modified" version="1.1"');
      t.b("\n" + i);
      t.b('     viewBox="0 0 14 16" width="14">');
      t.b("\n" + i);
      t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM4 8c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"></path>');
      t.b("\n" + i);
      t.b("</svg>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["icon-file-deleted"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<svg aria-hidden="true" class="d2h-icon d2h-deleted" height="16" title="removed" version="1.1"');
      t.b("\n" + i);
      t.b('     viewBox="0 0 14 16" width="14">');
      t.b("\n" + i);
      t.b('    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM11 9H3V7h8v2z"></path>');
      t.b("\n" + i);
      t.b("</svg>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["icon-file-renamed"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<svg aria-hidden="true" class="d2h-icon d2h-moved" height="16" title="renamed" version="1.1"');
      t.b("\n" + i);
      t.b('     viewBox="0 0 14 16" width="14">');
      t.b("\n" + i);
      t.b('    <path d="M6 9H3V7h3V4l5 4-5 4V9z m8-7v12c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h12c0.55 0 1 0.45 1 1z m-1 0H1v12h12V2z"></path>');
      t.b("\n" + i);
      t.b("</svg>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["icon-file"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<svg aria-hidden="true" class="d2h-icon" height="16" version="1.1" viewBox="0 0 12 16" width="12">');
      t.b("\n" + i);
      t.b('    <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>');
      t.b("\n" + i);
      t.b("</svg>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["line-by-line-file-diff"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<div id="');
      t.b(t.v(t.f("fileHtmlId", c, p, 0)));
      t.b('" class="d2h-file-wrapper" data-lang="');
      t.b(t.v(t.d("file.language", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('    <div class="d2h-file-header">');
      t.b("\n" + i);
      t.b("    ");
      t.b(t.t(t.f("filePath", c, p, 0)));
      t.b("\n" + i);
      t.b("    </div>");
      t.b("\n" + i);
      t.b('    <div class="d2h-file-diff">');
      t.b("\n" + i);
      t.b('        <div class="d2h-code-wrapper">');
      t.b("\n" + i);
      t.b('            <table class="d2h-diff-table">');
      t.b("\n" + i);
      t.b('                <tbody class="d2h-diff-tbody">');
      t.b("\n" + i);
      t.b("                ");
      t.b(t.t(t.f("diffs", c, p, 0)));
      t.b("\n" + i);
      t.b("                </tbody>");
      t.b("\n" + i);
      t.b("            </table>");
      t.b("\n" + i);
      t.b("        </div>");
      t.b("\n" + i);
      t.b("    </div>");
      t.b("\n" + i);
      t.b("</div>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["line-by-line-numbers"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<div class="line-num1">');
      t.b(t.v(t.f("oldNumber", c, p, 0)));
      t.b("</div>");
      t.b("\n" + i);
      t.b('<div class="line-num2">');
      t.b(t.v(t.f("newNumber", c, p, 0)));
      t.b("</div>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["side-by-side-file-diff"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<div id="');
      t.b(t.v(t.f("fileHtmlId", c, p, 0)));
      t.b('" class="d2h-file-wrapper" data-lang="');
      t.b(t.v(t.d("file.language", c, p, 0)));
      t.b('">');
      t.b("\n" + i);
      t.b('    <div class="d2h-file-header">');
      t.b("\n" + i);
      t.b("      ");
      t.b(t.t(t.f("filePath", c, p, 0)));
      t.b("\n" + i);
      t.b("    </div>");
      t.b("\n" + i);
      t.b('    <div class="d2h-files-diff">');
      t.b("\n" + i);
      t.b('        <div class="d2h-file-side-diff">');
      t.b("\n" + i);
      t.b('            <div class="d2h-code-wrapper">');
      t.b("\n" + i);
      t.b('                <table class="d2h-diff-table">');
      t.b("\n" + i);
      t.b('                    <tbody class="d2h-diff-tbody">');
      t.b("\n" + i);
      t.b("                    ");
      t.b(t.t(t.d("diffs.left", c, p, 0)));
      t.b("\n" + i);
      t.b("                    </tbody>");
      t.b("\n" + i);
      t.b("                </table>");
      t.b("\n" + i);
      t.b("            </div>");
      t.b("\n" + i);
      t.b("        </div>");
      t.b("\n" + i);
      t.b('        <div class="d2h-file-side-diff">');
      t.b("\n" + i);
      t.b('            <div class="d2h-code-wrapper">');
      t.b("\n" + i);
      t.b('                <table class="d2h-diff-table">');
      t.b("\n" + i);
      t.b('                    <tbody class="d2h-diff-tbody">');
      t.b("\n" + i);
      t.b("                    ");
      t.b(t.t(t.d("diffs.right", c, p, 0)));
      t.b("\n" + i);
      t.b("                    </tbody>");
      t.b("\n" + i);
      t.b("                </table>");
      t.b("\n" + i);
      t.b("            </div>");
      t.b("\n" + i);
      t.b("        </div>");
      t.b("\n" + i);
      t.b("    </div>");
      t.b("\n" + i);
      t.b("</div>");
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["tag-file-added"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<span class="d2h-tag d2h-added d2h-added-tag">ADDED</span>');
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["tag-file-changed"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<span class="d2h-tag d2h-changed d2h-changed-tag">CHANGED</span>');
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["tag-file-deleted"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<span class="d2h-tag d2h-deleted d2h-deleted-tag">DELETED</span>');
      return t.fl();
    }, partials: {}, subs: {} });
    exports2.defaultTemplates["tag-file-renamed"] = new Hogan2.Template({ code: function(c, p, i) {
      var t = this;
      t.b(i = i || "");
      t.b('<span class="d2h-tag d2h-moved d2h-moved-tag">RENAMED</span>');
      return t.fl();
    }, partials: {}, subs: {} });
  }
});

// node_modules/diff2html/lib/hoganjs-utils.js
var require_hoganjs_utils = __commonJS({
  "node_modules/diff2html/lib/hoganjs-utils.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    var Hogan2 = __importStar(require_hogan());
    var diff2html_templates_1 = require_diff2html_templates();
    var HoganJsUtils = class {
      constructor({ compiledTemplates = {}, rawTemplates = {} }) {
        const compiledRawTemplates = Object.entries(rawTemplates).reduce((previousTemplates, [name, templateString]) => {
          const compiledTemplate = Hogan2.compile(templateString, { asString: false });
          return Object.assign(Object.assign({}, previousTemplates), { [name]: compiledTemplate });
        }, {});
        this.preCompiledTemplates = Object.assign(Object.assign(Object.assign({}, diff2html_templates_1.defaultTemplates), compiledTemplates), compiledRawTemplates);
      }
      static compile(templateString) {
        return Hogan2.compile(templateString, { asString: false });
      }
      render(namespace, view, params, partials, indent) {
        const templateKey = this.templateKey(namespace, view);
        try {
          const template = this.preCompiledTemplates[templateKey];
          return template.render(params, partials, indent);
        } catch (_e) {
          throw new Error(`Could not find template to render '${templateKey}'`);
        }
      }
      template(namespace, view) {
        return this.preCompiledTemplates[this.templateKey(namespace, view)];
      }
      templateKey(namespace, view) {
        return `${namespace}-${view}`;
      }
    };
    exports2.default = HoganJsUtils;
  }
});

// node_modules/diff2html/lib/diff2html.js
var require_diff2html = __commonJS({
  "node_modules/diff2html/lib/diff2html.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultDiff2HtmlConfig = void 0;
    exports2.parse = parse2;
    exports2.html = html;
    var DiffParser = __importStar(require_diff_parser());
    var file_list_renderer_1 = require_file_list_renderer();
    var line_by_line_renderer_1 = __importStar(require_line_by_line_renderer());
    var side_by_side_renderer_1 = __importStar(require_side_by_side_renderer());
    var types_1 = require_types();
    var hoganjs_utils_1 = __importDefault(require_hoganjs_utils());
    exports2.defaultDiff2HtmlConfig = Object.assign(Object.assign(Object.assign({}, line_by_line_renderer_1.defaultLineByLineRendererConfig), side_by_side_renderer_1.defaultSideBySideRendererConfig), { outputFormat: types_1.OutputFormatType.LINE_BY_LINE, drawFileList: true });
    function parse2(diffInput, configuration = {}) {
      return DiffParser.parse(diffInput, Object.assign(Object.assign({}, exports2.defaultDiff2HtmlConfig), configuration));
    }
    function html(diffInput, configuration = {}) {
      const config = Object.assign(Object.assign({}, exports2.defaultDiff2HtmlConfig), configuration);
      const diffJson = typeof diffInput === "string" ? DiffParser.parse(diffInput, config) : diffInput;
      const hoganUtils = new hoganjs_utils_1.default(config);
      const { colorScheme } = config;
      const fileListRendererConfig = { colorScheme };
      const fileList = config.drawFileList ? new file_list_renderer_1.FileListRenderer(hoganUtils, fileListRendererConfig).render(diffJson) : "";
      const diffOutput = config.outputFormat === "side-by-side" ? new side_by_side_renderer_1.default(hoganUtils, config).render(diffJson) : new line_by_line_renderer_1.default(hoganUtils, config).render(diffJson);
      return fileList + diffOutput;
    }
  }
});

// node_modules/diff2html/lib/ui/js/highlight.js-helpers.js
var require_highlight_js_helpers = __commonJS({
  "node_modules/diff2html/lib/ui/js/highlight.js-helpers.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.nodeStream = nodeStream;
    exports2.mergeStreams = mergeStreams;
    exports2.closeTags = closeTags;
    exports2.getLanguage = getLanguage;
    function escapeHTML(value) {
      return value.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;");
    }
    function tag(node) {
      return node.nodeName.toLowerCase();
    }
    function nodeStream(node) {
      const result = [];
      const nodeStream2 = (node2, offset) => {
        for (let child = node2.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === 3 && child.nodeValue !== null) {
            offset += child.nodeValue.length;
          } else if (child.nodeType === 1) {
            result.push({
              event: "start",
              offset,
              node: child
            });
            offset = nodeStream2(child, offset);
            if (!tag(child).match(/br|hr|img|input/)) {
              result.push({
                event: "stop",
                offset,
                node: child
              });
            }
          }
        }
        return offset;
      };
      nodeStream2(node, 0);
      return result;
    }
    function mergeStreams(original, highlighted, value) {
      let processed = 0;
      let result = "";
      const nodeStack = [];
      function isElement(arg) {
        return arg !== null && (arg === null || arg === void 0 ? void 0 : arg.attributes) !== void 0;
      }
      function selectStream() {
        if (!original.length || !highlighted.length) {
          return original.length ? original : highlighted;
        }
        if (original[0].offset !== highlighted[0].offset) {
          return original[0].offset < highlighted[0].offset ? original : highlighted;
        }
        return highlighted[0].event === "start" ? original : highlighted;
      }
      function open(node) {
        if (!isElement(node)) {
          throw new Error("Node is not an Element");
        }
        result += `<${tag(node)} ${Array().map.call(node.attributes, (attr) => `${attr.nodeName}="${escapeHTML(attr.value).replace(/"/g, "&quot;")}"`).join(" ")}>`;
      }
      function close(node) {
        result += "</" + tag(node) + ">";
      }
      function render(event) {
        (event.event === "start" ? open : close)(event.node);
      }
      while (original.length || highlighted.length) {
        let stream = selectStream();
        result += escapeHTML(value.substring(processed, stream[0].offset));
        processed = stream[0].offset;
        if (stream === original) {
          nodeStack.reverse().forEach(close);
          do {
            render(stream.splice(0, 1)[0]);
            stream = selectStream();
          } while (stream === original && stream.length && stream[0].offset === processed);
          nodeStack.reverse().forEach(open);
        } else {
          if (stream[0].event === "start") {
            nodeStack.push(stream[0].node);
          } else {
            nodeStack.pop();
          }
          render(stream.splice(0, 1)[0]);
        }
      }
      return result + escapeHTML(value.substr(processed));
    }
    function closeTags(res) {
      const tokenStack = new Array();
      res.value = res.value.split("\n").map((line) => {
        const prepend = tokenStack.map((token) => `<span class="${token}">`).join("");
        const matches = line.matchAll(/(<span class="(.*?)">|<\/span>)/g);
        Array.from(matches).forEach((match) => {
          if (match[0] === "</span>")
            tokenStack.shift();
          else
            tokenStack.unshift(match[2]);
        });
        const append = "</span>".repeat(tokenStack.length);
        return prepend + line + append;
      }).join("\n");
      return res;
    }
    var languagesToExt = {
      "1c": "1c",
      abnf: "abnf",
      accesslog: "accesslog",
      as: "actionscript",
      adb: "ada",
      ada: "ada",
      ads: "ada",
      angelscript: "angelscript",
      apache: "apache",
      applescript: "applescript",
      scpt: "applescript",
      arcade: "arcade",
      cpp: "cpp",
      hpp: "cpp",
      arduino: "arduino",
      ino: "arduino",
      armasm: "armasm",
      arm: "armasm",
      xml: "xml",
      html: "xml",
      xhtml: "xml",
      rss: "xml",
      atom: "xml",
      xjb: "xml",
      xsd: "xml",
      xsl: "xml",
      plist: "xml",
      svg: "xml",
      asciidoc: "asciidoc",
      adoc: "asciidoc",
      asc: "asciidoc",
      aspectj: "aspectj",
      ahk: "autohotkey",
      ahkl: "autohotkey",
      au3: "autoit",
      avrasm: "avrasm",
      awk: "awk",
      axapta: "axapta",
      "x++": "axapta",
      bash: "bash",
      sh: "bash",
      zsh: "bash",
      b: "basic",
      bnf: "bnf",
      bf: "brainfuck",
      c: "c",
      h: "c",
      cats: "c",
      idc: "c",
      cal: "cal",
      capnproto: "capnproto",
      capnp: "capnproto",
      ceylon: "ceylon",
      clean: "clean",
      clj: "clojure",
      boot: "clojure",
      cl2: "clojure",
      cljc: "clojure",
      cljs: "clojure",
      "cljs.hl": "clojure",
      cljscm: "clojure",
      cljx: "clojure",
      hic: "clojure",
      "clojure-repl": "clojure-repl",
      cmake: "cmake",
      "cmake.in": "cmake",
      coffee: "coffeescript",
      _coffee: "coffeescript",
      cake: "coffeescript",
      cjsx: "coffeescript",
      iced: "coffeescript",
      cson: "coffeescript",
      coq: "coq",
      cos: "cos",
      cls: "cos",
      crmsh: "crmsh",
      crm: "crmsh",
      pcmk: "crmsh",
      cr: "crystal",
      cs: "csharp",
      csx: "csharp",
      csp: "csp",
      css: "css",
      d: "d",
      di: "d",
      md: "markdown",
      markdown: "markdown",
      mdown: "markdown",
      mdwn: "markdown",
      mkd: "markdown",
      mkdn: "markdown",
      mkdown: "markdown",
      ronn: "markdown",
      workbook: "markdown",
      dart: "dart",
      dpr: "delphi",
      dfm: "delphi",
      pas: "delphi",
      pascal: "delphi",
      diff: "diff",
      patch: "diff",
      django: "django",
      jinja: "django",
      dns: "dns",
      zone: "dns",
      bind: "dns",
      dockerfile: "dockerfile",
      docker: "dockerfile",
      dos: "dos",
      bat: "dos",
      cmd: "dos",
      dsconfig: "dsconfig",
      dts: "dts",
      dust: "dust",
      dst: "dust",
      ebnf: "ebnf",
      ex: "elixir",
      exs: "elixir",
      elm: "elm",
      rb: "ruby",
      builder: "ruby",
      eye: "ruby",
      gemspec: "ruby",
      god: "ruby",
      jbuilder: "ruby",
      mspec: "ruby",
      pluginspec: "ruby",
      podspec: "ruby",
      rabl: "ruby",
      rake: "ruby",
      rbuild: "ruby",
      rbw: "ruby",
      rbx: "ruby",
      ru: "ruby",
      ruby: "ruby",
      spec: "ruby",
      thor: "ruby",
      watchr: "ruby",
      erb: "erb",
      "erlang-repl": "erlang-repl",
      erl: "erlang",
      "app.src": "erlang",
      escript: "erlang",
      hrl: "erlang",
      xrl: "erlang",
      yrl: "erlang",
      excel: "excel",
      xls: "excel",
      xlsx: "excel",
      fix: "fix",
      flix: "flix",
      f90: "fortran",
      f: "fortran",
      f03: "fortran",
      f08: "fortran",
      f77: "fortran",
      f95: "fortran",
      for: "fortran",
      fpp: "fortran",
      fs: "fsharp",
      fsx: "fsharp",
      gams: "gams",
      gms: "gams",
      gauss: "gauss",
      gss: "gauss",
      gcode: "gcode",
      nc: "gcode",
      gherkin: "gherkin",
      glsl: "glsl",
      fp: "glsl",
      frag: "glsl",
      frg: "glsl",
      fsh: "glsl",
      fshader: "glsl",
      geo: "glsl",
      geom: "glsl",
      glslv: "glsl",
      gshader: "glsl",
      shader: "glsl",
      tesc: "glsl",
      tese: "glsl",
      vert: "glsl",
      vrx: "glsl",
      vsh: "glsl",
      vshader: "glsl",
      gml: "gml",
      go: "go",
      bal: "go",
      golo: "golo",
      gololang: "golo",
      gradle: "gradle",
      groovy: "groovy",
      grt: "groovy",
      gtpl: "groovy",
      gvy: "groovy",
      haml: "haml",
      "haml.deface": "haml",
      handlebars: "handlebars",
      hbs: "handlebars",
      "html.hbs": "handlebars",
      "html.handlebars": "handlebars",
      hs: "haskell",
      hsc: "haskell",
      idr: "haskell",
      purs: "haskell",
      hx: "haxe",
      hxsl: "haxe",
      hsp: "hsp",
      htmlbars: "htmlbars",
      http: "http",
      https: "http",
      hy: "hy",
      inform7: "inform7",
      i7: "inform7",
      ini: "ini",
      toml: "ini",
      cfg: "ini",
      prefs: "ini",
      irpf90: "irpf90",
      isbl: "isbl",
      java: "java",
      jsp: "java",
      js: "javascript",
      jsx: "javascript",
      _js: "javascript",
      bones: "javascript",
      es: "javascript",
      es6: "javascript",
      gs: "javascript",
      jake: "javascript",
      jsb: "javascript",
      jscad: "javascript",
      jsfl: "javascript",
      jsm: "javascript",
      jss: "javascript",
      mjs: "javascript",
      njs: "javascript",
      pac: "javascript",
      sjs: "javascript",
      ssjs: "javascript",
      xsjs: "javascript",
      xsjslib: "javascript",
      cfc: "javascript",
      "jboss-cli": "jboss-cli",
      json: "json",
      avsc: "json",
      geojson: "json",
      gltf: "json",
      "JSON-tmLanguage": "json",
      jsonl: "json",
      tfstate: "json",
      "tfstate.backup": "json",
      topojson: "json",
      webapp: "json",
      webmanifest: "json",
      jl: "julia",
      "julia-repl": "julia-repl",
      kt: "kotlin",
      ktm: "kotlin",
      kts: "kotlin",
      lasso: "lasso",
      lassoscript: "lasso",
      tex: "latex",
      ldif: "ldif",
      leaf: "leaf",
      less: "less",
      lisp: "lisp",
      factor: "lisp",
      livecodeserver: "livecodeserver",
      ls: "livescript",
      _ls: "livescript",
      llvm: "llvm",
      lsl: "lsl",
      lua: "lua",
      nse: "lua",
      p8: "lua",
      pd_lua: "lua",
      rbxs: "lua",
      wlua: "lua",
      mak: "makefile",
      make: "makefile",
      mk: "makefile",
      mkfile: "makefile",
      mathematica: "mathematica",
      mma: "mathematica",
      wl: "mathematica",
      matlab: "matlab",
      maxima: "maxima",
      mel: "mel",
      mercury: "mercury",
      mipsasm: "mipsasm",
      miz: "mizar",
      voc: "mizar",
      al: "perl",
      cgi: "perl",
      fcgi: "perl",
      perl: "perl",
      ph: "perl",
      plx: "perl",
      pl: "perl",
      pm: "perl",
      psgi: "perl",
      t: "perl",
      mojolicious: "mojolicious",
      monkey: "monkey",
      monkey2: "monkey",
      moonscript: "moonscript",
      moon: "moonscript",
      n1ql: "n1ql",
      nginxconf: "nginx",
      nim: "nim",
      nimrod: "nim",
      nix: "nix",
      nsi: "nsis",
      nsh: "nsis",
      m: "objectivec",
      objc: "objectivec",
      mm: "objectivec",
      "obj-c": "objectivec",
      "obj-c++": "objectivec",
      "objective-c++": "objectivec",
      fun: "ocaml",
      sig: "ocaml",
      ml: "ocaml",
      mli: "ocaml",
      eliom: "ocaml",
      eliomi: "ocaml",
      ml4: "ocaml",
      mll: "ocaml",
      mly: "ocaml",
      openscad: "openscad",
      oxygene: "oxygene",
      parser3: "parser3",
      pf: "pf",
      "pf.conf": "pf",
      pgsql: "pgsql",
      postgres: "pgsql",
      postgresql: "pgsql",
      php: "php",
      aw: "php",
      ctp: "php",
      inc: "php",
      php3: "php",
      php4: "php",
      php5: "php",
      phps: "php",
      phpt: "php",
      "php-template": "php-template",
      plaintext: "plaintext",
      txt: "plaintext",
      text: "plaintext",
      pony: "pony",
      ps: "powershell",
      ps1: "powershell",
      psd1: "powershell",
      psm1: "powershell",
      pde: "processing",
      profile: "profile",
      pro: "prolog",
      prolog: "prolog",
      yap: "prolog",
      properties: "properties",
      proto: "protobuf",
      puppet: "puppet",
      pp: "puppet",
      purebasic: "purebasic",
      py: "python",
      bzl: "python",
      gyp: "python",
      gypi: "python",
      lmi: "python",
      py3: "python",
      pyde: "python",
      pyi: "python",
      pyp: "python",
      pyt: "python",
      pyw: "python",
      rpy: "python",
      tac: "python",
      wsgi: "python",
      xpy: "python",
      "python-repl": "python-repl",
      pycon: "python-repl",
      q: "q",
      k: "q",
      kdb: "q",
      qml: "qml",
      r: "r",
      rd: "r",
      rsx: "r",
      reasonml: "reasonml",
      re: "reasonml",
      rib: "rib",
      roboconf: "roboconf",
      graph: "roboconf",
      instances: "roboconf",
      routeros: "routeros",
      rsl: "rsl",
      ruleslanguage: "ruleslanguage",
      rs: "rust",
      "rs.in": "rust",
      sas: "sas",
      scala: "scala",
      kojo: "scala",
      sbt: "scala",
      sc: "scala",
      scm: "scheme",
      sch: "scheme",
      sld: "scheme",
      sls: "scheme",
      sps: "scheme",
      ss: "scheme",
      rkt: "scheme",
      scilab: "scilab",
      scss: "scss",
      shell: "shell",
      smali: "smali",
      st: "smalltalk",
      sml: "sml",
      sqf: "sqf",
      sql: "sql",
      cql: "sql",
      ddl: "sql",
      mysql: "sql",
      prc: "sql",
      tab: "sql",
      udf: "sql",
      viw: "sql",
      stan: "stan",
      stanfuncs: "stan",
      stata: "stata",
      step21: "step21",
      step: "step21",
      stp: "step21",
      styl: "stylus",
      subunit: "subunit",
      swift: "swift",
      taggerscript: "taggerscript",
      yml: "yaml",
      mir: "yaml",
      reek: "yaml",
      rviz: "yaml",
      "sublime-syntax": "yaml",
      syntax: "yaml",
      yaml: "yaml",
      "yaml-tmlanguage": "yaml",
      "yml.mysql": "yaml",
      tap: "tap",
      tcl: "tcl",
      adp: "tcl",
      tm: "tcl",
      thrift: "thrift",
      tp: "tp",
      twig: "twig",
      craftcms: "twig",
      ts: "typescript",
      tsx: "typescript",
      vala: "vala",
      vbnet: "vbnet",
      vb: "vbnet",
      vbscript: "vbscript",
      vbs: "vbscript",
      "vbscript-html": "vbscript-html",
      v: "verilog",
      veo: "verilog",
      vhdl: "vhdl",
      vhd: "vhdl",
      vhf: "vhdl",
      vhi: "vhdl",
      vho: "vhdl",
      vhs: "vhdl",
      vht: "vhdl",
      vhw: "vhdl",
      vim: "vim",
      x86asm: "x86asm",
      xl: "xl",
      xquery: "xquery",
      xpath: "xquery",
      xq: "xquery",
      zephir: "zephir",
      zep: "zephir"
    };
    function getLanguage(fileExtension) {
      var _a;
      return (_a = languagesToExt[fileExtension]) !== null && _a !== void 0 ? _a : "plaintext";
    }
  }
});

// node_modules/diff2html/lib/ui/js/diff2html-ui-base.js
var require_diff2html_ui_base = __commonJS({
  "node_modules/diff2html/lib/ui/js/diff2html-ui-base.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Diff2HtmlUI = exports2.defaultDiff2HtmlUIConfig = void 0;
    var highlight_js_helpers_1 = require_highlight_js_helpers();
    var diff2html_1 = require_diff2html();
    exports2.defaultDiff2HtmlUIConfig = Object.assign(Object.assign({}, diff2html_1.defaultDiff2HtmlConfig), { synchronisedScroll: true, highlight: true, fileListToggle: true, fileListStartVisible: false, highlightLanguages: /* @__PURE__ */ new Map(), smartSelection: true, fileContentToggle: true, stickyFileHeaders: true });
    var Diff2HtmlUI2 = class {
      constructor(target, diffInput, config = {}, hljs) {
        this.hljs = null;
        this.currentSelectionColumnId = -1;
        this.config = Object.assign(Object.assign({}, exports2.defaultDiff2HtmlUIConfig), config);
        this.diffHtml = diffInput !== void 0 ? (0, diff2html_1.html)(diffInput, this.config) : target.innerHTML;
        this.targetElement = target;
        if (hljs !== void 0)
          this.hljs = hljs;
      }
      draw() {
        this.targetElement.innerHTML = this.diffHtml;
        if (this.config.synchronisedScroll)
          this.synchronisedScroll();
        if (this.config.highlight)
          this.highlightCode();
        if (this.config.fileListToggle)
          this.fileListToggle(this.config.fileListStartVisible);
        if (this.config.fileContentToggle)
          this.fileContentToggle();
        if (this.config.stickyFileHeaders)
          this.stickyFileHeaders();
      }
      synchronisedScroll() {
        this.targetElement.querySelectorAll(".d2h-file-wrapper").forEach((wrapper) => {
          const [left, right] = Array().slice.call(wrapper.querySelectorAll(".d2h-file-side-diff"));
          if (left === void 0 || right === void 0)
            return;
          const onScroll = (event) => {
            if (event === null || event.target === null)
              return;
            if (event.target === left) {
              right.scrollTop = left.scrollTop;
              right.scrollLeft = left.scrollLeft;
            } else {
              left.scrollTop = right.scrollTop;
              left.scrollLeft = right.scrollLeft;
            }
          };
          left.addEventListener("scroll", onScroll);
          right.addEventListener("scroll", onScroll);
        });
      }
      fileListToggle(startVisible) {
        const showBtn = this.targetElement.querySelector(".d2h-show");
        const hideBtn = this.targetElement.querySelector(".d2h-hide");
        const fileList = this.targetElement.querySelector(".d2h-file-list");
        if (showBtn === null || hideBtn === null || fileList === null)
          return;
        const show = () => {
          showBtn.style.display = "none";
          hideBtn.style.display = "inline";
          fileList.style.display = "block";
        };
        const hide = () => {
          showBtn.style.display = "inline";
          hideBtn.style.display = "none";
          fileList.style.display = "none";
        };
        showBtn.addEventListener("click", () => show());
        hideBtn.addEventListener("click", () => hide());
        const hashTag = this.getHashTag();
        if (hashTag === "files-summary-show")
          show();
        else if (hashTag === "files-summary-hide")
          hide();
        else if (startVisible)
          show();
        else
          hide();
      }
      fileContentToggle() {
        this.targetElement.querySelectorAll(".d2h-file-collapse").forEach((fileContentToggleBtn) => {
          fileContentToggleBtn.style.display = "flex";
          const toggleFileContents = (selector) => {
            var _a;
            const fileContents = (_a = fileContentToggleBtn.closest(".d2h-file-wrapper")) === null || _a === void 0 ? void 0 : _a.querySelector(selector);
            if (fileContents !== null && fileContents !== void 0) {
              fileContentToggleBtn.classList.toggle("d2h-selected");
              fileContents.classList.toggle("d2h-d-none");
            }
          };
          const toggleHandler = (e) => {
            if (fileContentToggleBtn === e.target)
              return;
            toggleFileContents(".d2h-file-diff");
            toggleFileContents(".d2h-files-diff");
          };
          fileContentToggleBtn.addEventListener("click", (e) => toggleHandler(e));
        });
      }
      highlightCode() {
        const hljs = this.hljs;
        if (hljs === null) {
          throw new Error("Missing a `highlight.js` implementation. Please provide one when instantiating Diff2HtmlUI.");
        }
        const files = this.targetElement.querySelectorAll(".d2h-file-wrapper");
        files.forEach((file) => {
          const language = file.getAttribute("data-lang");
          if (!(this.config.highlightLanguages instanceof Map)) {
            this.config.highlightLanguages = new Map(Object.entries(this.config.highlightLanguages));
          }
          let hljsLanguage = language && this.config.highlightLanguages.has(language) ? this.config.highlightLanguages.get(language) : language ? (0, highlight_js_helpers_1.getLanguage)(language) : "plaintext";
          if (hljs.getLanguage(hljsLanguage) === void 0) {
            hljsLanguage = "plaintext";
          }
          const codeLines = file.querySelectorAll(".d2h-code-line-ctn");
          codeLines.forEach((line) => {
            const text = line.textContent;
            const lineParent = line.parentNode;
            if (text === null || lineParent === null || !this.isElement(lineParent))
              return;
            const result = (0, highlight_js_helpers_1.closeTags)(hljs.highlight(text, {
              language: hljsLanguage,
              ignoreIllegals: true
            }));
            const originalStream = (0, highlight_js_helpers_1.nodeStream)(line);
            if (originalStream.length) {
              const resultNode = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
              resultNode.innerHTML = result.value;
              result.value = (0, highlight_js_helpers_1.mergeStreams)(originalStream, (0, highlight_js_helpers_1.nodeStream)(resultNode), text);
            }
            line.classList.add("hljs");
            if (result.language) {
              line.classList.add(result.language);
            }
            line.innerHTML = result.value;
          });
        });
      }
      stickyFileHeaders() {
        this.targetElement.querySelectorAll(".d2h-file-header").forEach((header) => {
          header.classList.add("d2h-sticky-header");
        });
      }
      smartSelection() {
        console.warn("Smart selection is now enabled by default with CSS. No need to call this method anymore.");
      }
      getHashTag() {
        const docUrl = document.URL;
        const hashTagIndex = docUrl.indexOf("#");
        let hashTag = null;
        if (hashTagIndex !== -1) {
          hashTag = docUrl.substr(hashTagIndex + 1);
        }
        return hashTag;
      }
      isElement(arg) {
        return arg !== null && (arg === null || arg === void 0 ? void 0 : arg.classList) !== void 0;
      }
    };
    exports2.Diff2HtmlUI = Diff2HtmlUI2;
  }
});

// node_modules/highlight.js/lib/core.js
var require_core = __commonJS({
  "node_modules/highlight.js/lib/core.js"(exports2, module2) {
    function deepFreeze(obj) {
      if (obj instanceof Map) {
        obj.clear = obj.delete = obj.set = function() {
          throw new Error("map is read-only");
        };
      } else if (obj instanceof Set) {
        obj.add = obj.clear = obj.delete = function() {
          throw new Error("set is read-only");
        };
      }
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((name) => {
        const prop = obj[name];
        const type = typeof prop;
        if ((type === "object" || type === "function") && !Object.isFrozen(prop)) {
          deepFreeze(prop);
        }
      });
      return obj;
    }
    var Response = class {
      /**
       * @param {CompiledMode} mode
       */
      constructor(mode) {
        if (mode.data === void 0) mode.data = {};
        this.data = mode.data;
        this.isMatchIgnored = false;
      }
      ignoreMatch() {
        this.isMatchIgnored = true;
      }
    };
    function escapeHTML(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    }
    function inherit$1(original, ...objects) {
      const result = /* @__PURE__ */ Object.create(null);
      for (const key2 in original) {
        result[key2] = original[key2];
      }
      objects.forEach(function(obj) {
        for (const key2 in obj) {
          result[key2] = obj[key2];
        }
      });
      return (
        /** @type {T} */
        result
      );
    }
    var SPAN_CLOSE = "</span>";
    var emitsWrappingTags = (node) => {
      return !!node.scope;
    };
    var scopeToCSSClass = (name, { prefix }) => {
      if (name.startsWith("language:")) {
        return name.replace("language:", "language-");
      }
      if (name.includes(".")) {
        const pieces = name.split(".");
        return [
          `${prefix}${pieces.shift()}`,
          ...pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`)
        ].join(" ");
      }
      return `${prefix}${name}`;
    };
    var HTMLRenderer = class {
      /**
       * Creates a new HTMLRenderer
       *
       * @param {Tree} parseTree - the parse tree (must support `walk` API)
       * @param {{classPrefix: string}} options
       */
      constructor(parseTree, options) {
        this.buffer = "";
        this.classPrefix = options.classPrefix;
        parseTree.walk(this);
      }
      /**
       * Adds texts to the output stream
       *
       * @param {string} text */
      addText(text) {
        this.buffer += escapeHTML(text);
      }
      /**
       * Adds a node open to the output stream (if needed)
       *
       * @param {Node} node */
      openNode(node) {
        if (!emitsWrappingTags(node)) return;
        const className = scopeToCSSClass(
          node.scope,
          { prefix: this.classPrefix }
        );
        this.span(className);
      }
      /**
       * Adds a node close to the output stream (if needed)
       *
       * @param {Node} node */
      closeNode(node) {
        if (!emitsWrappingTags(node)) return;
        this.buffer += SPAN_CLOSE;
      }
      /**
       * returns the accumulated buffer
      */
      value() {
        return this.buffer;
      }
      // helpers
      /**
       * Builds a span element
       *
       * @param {string} className */
      span(className) {
        this.buffer += `<span class="${className}">`;
      }
    };
    var newNode = (opts = {}) => {
      const result = { children: [] };
      Object.assign(result, opts);
      return result;
    };
    var TokenTree = class _TokenTree {
      constructor() {
        this.rootNode = newNode();
        this.stack = [this.rootNode];
      }
      get top() {
        return this.stack[this.stack.length - 1];
      }
      get root() {
        return this.rootNode;
      }
      /** @param {Node} node */
      add(node) {
        this.top.children.push(node);
      }
      /** @param {string} scope */
      openNode(scope) {
        const node = newNode({ scope });
        this.add(node);
        this.stack.push(node);
      }
      closeNode() {
        if (this.stack.length > 1) {
          return this.stack.pop();
        }
        return void 0;
      }
      closeAllNodes() {
        while (this.closeNode()) ;
      }
      toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }
      /**
       * @typedef { import("./html_renderer").Renderer } Renderer
       * @param {Renderer} builder
       */
      walk(builder) {
        return this.constructor._walk(builder, this.rootNode);
      }
      /**
       * @param {Renderer} builder
       * @param {Node} node
       */
      static _walk(builder, node) {
        if (typeof node === "string") {
          builder.addText(node);
        } else if (node.children) {
          builder.openNode(node);
          node.children.forEach((child) => this._walk(builder, child));
          builder.closeNode(node);
        }
        return builder;
      }
      /**
       * @param {Node} node
       */
      static _collapse(node) {
        if (typeof node === "string") return;
        if (!node.children) return;
        if (node.children.every((el) => typeof el === "string")) {
          node.children = [node.children.join("")];
        } else {
          node.children.forEach((child) => {
            _TokenTree._collapse(child);
          });
        }
      }
    };
    var TokenTreeEmitter = class extends TokenTree {
      /**
       * @param {*} options
       */
      constructor(options) {
        super();
        this.options = options;
      }
      /**
       * @param {string} text
       */
      addText(text) {
        if (text === "") {
          return;
        }
        this.add(text);
      }
      /** @param {string} scope */
      startScope(scope) {
        this.openNode(scope);
      }
      endScope() {
        this.closeNode();
      }
      /**
       * @param {Emitter & {root: DataNode}} emitter
       * @param {string} name
       */
      __addSublanguage(emitter, name) {
        const node = emitter.root;
        if (name) node.scope = `language:${name}`;
        this.add(node);
      }
      toHTML() {
        const renderer = new HTMLRenderer(this, this.options);
        return renderer.value();
      }
      finalize() {
        this.closeAllNodes();
        return true;
      }
    };
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;
      return re.source;
    }
    function lookahead(re) {
      return concat("(?=", re, ")");
    }
    function anyNumberOfTimes(re) {
      return concat("(?:", re, ")*");
    }
    function optional(re) {
      return concat("(?:", re, ")?");
    }
    function concat(...args) {
      const joined = args.map((x) => source(x)).join("");
      return joined;
    }
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];
      if (typeof opts === "object" && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }
    function either(...args) {
      const opts = stripOptionsFromArgs(args);
      const joined = "(" + (opts.capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")";
      return joined;
    }
    function countMatchGroups(re) {
      return new RegExp(re.toString() + "|").exec("").length - 1;
    }
    function startsWith(re, lexeme) {
      const match = re && re.exec(lexeme);
      return match && match.index === 0;
    }
    var BACKREF_RE = new RegExp(either(
      /\[(?:[^\\\]]|\\.)*\]/,
      // a character class, inside which ( and \ lose their meaning
      /\(\?<(?![=!])[^>]+>/,
      // a named capture group `(?<name>` (not a lookbehind `(?<=` / `(?<!`)
      /\(\?'[^']+'/,
      // a named capture group `(?'name'`
      /\(\??/,
      // an opening parenthesis, capturing or non-capturing / lookahead
      /\\([1-9][0-9]*)/,
      // a backreference like `\1`
      /\\./
      // any other escape sequence
    ));
    function _rewriteBackreferences(regexps, { joinWith }) {
      let numCaptures = 0;
      return regexps.map((regex) => {
        numCaptures += 1;
        const offset = numCaptures;
        let re = source(regex);
        let out = "";
        while (re.length > 0) {
          const match = BACKREF_RE.exec(re);
          if (!match) {
            out += re;
            break;
          }
          out += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] === "\\" && match[1]) {
            out += "\\" + String(Number(match[1]) + offset);
          } else {
            out += match[0];
            if (match[0] === "(" || /^\(\?[<']/.test(match[0])) {
              numCaptures++;
            }
          }
        }
        return out;
      }).map((re) => `(${re})`).join(joinWith);
    }
    var MATCH_NOTHING_RE = /\b\B/;
    var IDENT_RE3 = "[a-zA-Z]\\w*";
    var UNDERSCORE_IDENT_RE = "[a-zA-Z_]\\w*";
    var NUMBER_RE = "\\b\\d+(\\.\\d+)?";
    var C_NUMBER_RE = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";
    var BINARY_NUMBER_RE = "\\b(0b[01]+)";
    var RE_STARTERS_RE = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";
    var SHEBANG = (opts = {}) => {
      const beginShebang = /^#![ ]*\//;
      if (opts.binary) {
        opts.begin = concat(
          beginShebang,
          /.*\b/,
          opts.binary,
          /\b.*/
        );
      }
      return inherit$1({
        scope: "meta",
        begin: beginShebang,
        end: /$/,
        relevance: 0,
        /** @type {ModeCallback} */
        "on:begin": (m, resp) => {
          if (m.index !== 0) resp.ignoreMatch();
        }
      }, opts);
    };
    var BACKSLASH_ESCAPE = {
      begin: "\\\\[\\s\\S]",
      relevance: 0
    };
    var APOS_STRING_MODE = {
      scope: "string",
      begin: "'",
      end: "'",
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var QUOTE_STRING_MODE = {
      scope: "string",
      begin: '"',
      end: '"',
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    var COMMENT = function(begin, end, modeOptions = {}) {
      const mode = inherit$1(
        {
          scope: "comment",
          begin,
          end,
          contains: []
        },
        modeOptions
      );
      mode.contains.push({
        scope: "doctag",
        // hack to avoid the space from being included. the space is necessary to
        // match here to prevent the plain text rule below from gobbling up doctags
        begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: true,
        relevance: 0
      });
      const ENGLISH_WORD = either(
        // list of common 1 and 2 letter words in English
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        // note: this is not an exhaustive list of contractions, just popular ones
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
        // contractions - can't we'd they're let's, etc
        /[A-Za-z]+[-][a-z]+/,
        // `no-way`, etc.
        /[A-Za-z][a-z]{2,}/
        // allow capitalized words at beginning of sentences
      );
      mode.contains.push(
        {
          // TODO: how to include ", (, ) without breaking grammars that use these for
          // comment delimiters?
          // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
          // ---
          // this tries to find sequences of 3 english words in a row (without any
          // "programming" type syntax) this gives us a strong signal that we've
          // TRULY found a comment - vs perhaps scanning with the wrong language.
          // It's possible to find something that LOOKS like the start of the
          // comment - but then if there is no readable text - good chance it is a
          // false match and not a comment.
          //
          // for a visual example please see:
          // https://github.com/highlightjs/highlight.js/issues/2827
          begin: concat(
            /[ ]+/,
            // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
            "(",
            ENGLISH_WORD,
            /[.]?[:]?([.][ ]|[ ])/,
            "){3}"
          )
          // look for 3 words in a row
        }
      );
      return mode;
    };
    var C_LINE_COMMENT_MODE = COMMENT("//", "$");
    var C_BLOCK_COMMENT_MODE = COMMENT("/\\*", "\\*/");
    var HASH_COMMENT_MODE = COMMENT("#", "$");
    var NUMBER_MODE = {
      scope: "number",
      begin: NUMBER_RE,
      relevance: 0
    };
    var C_NUMBER_MODE = {
      scope: "number",
      begin: C_NUMBER_RE,
      relevance: 0
    };
    var BINARY_NUMBER_MODE = {
      scope: "number",
      begin: BINARY_NUMBER_RE,
      relevance: 0
    };
    var REGEXP_MODE = {
      scope: "regexp",
      begin: /\/(?=[^/\n]*\/)/,
      end: /\/[gimuy]*/,
      contains: [
        BACKSLASH_ESCAPE,
        {
          begin: /\[/,
          end: /\]/,
          relevance: 0,
          contains: [BACKSLASH_ESCAPE]
        }
      ]
    };
    var TITLE_MODE = {
      scope: "title",
      begin: IDENT_RE3,
      relevance: 0
    };
    var UNDERSCORE_TITLE_MODE = {
      scope: "title",
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: "\\.\\s*" + UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var END_SAME_AS_BEGIN = function(mode) {
      return Object.assign(
        mode,
        {
          /** @type {ModeCallback} */
          "on:begin": (m, resp) => {
            resp.data._beginMatch = m[1];
          },
          /** @type {ModeCallback} */
          "on:end": (m, resp) => {
            if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
          }
        }
      );
    };
    var MODES2 = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      APOS_STRING_MODE,
      BACKSLASH_ESCAPE,
      BINARY_NUMBER_MODE,
      BINARY_NUMBER_RE,
      COMMENT,
      C_BLOCK_COMMENT_MODE,
      C_LINE_COMMENT_MODE,
      C_NUMBER_MODE,
      C_NUMBER_RE,
      END_SAME_AS_BEGIN,
      HASH_COMMENT_MODE,
      IDENT_RE: IDENT_RE3,
      MATCH_NOTHING_RE,
      METHOD_GUARD,
      NUMBER_MODE,
      NUMBER_RE,
      PHRASAL_WORDS_MODE,
      QUOTE_STRING_MODE,
      REGEXP_MODE,
      RE_STARTERS_RE,
      SHEBANG,
      TITLE_MODE,
      UNDERSCORE_IDENT_RE,
      UNDERSCORE_TITLE_MODE
    });
    function skipIfHasPrecedingDot(match, response) {
      const before = match.input[match.index - 1];
      if (before === ".") {
        response.ignoreMatch();
      }
    }
    function scopeClassName(mode, _parent) {
      if (mode.className !== void 0) {
        mode.scope = mode.className;
        delete mode.className;
      }
    }
    function beginKeywords(mode, parent) {
      if (!parent) return;
      if (!mode.beginKeywords) return;
      mode.begin = "\\b(" + mode.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)";
      mode.__beforeBegin = skipIfHasPrecedingDot;
      mode.keywords = mode.keywords || mode.beginKeywords;
      delete mode.beginKeywords;
      if (mode.relevance === void 0) mode.relevance = 0;
    }
    function compileIllegal(mode, _parent) {
      if (!Array.isArray(mode.illegal)) return;
      mode.illegal = either(...mode.illegal);
    }
    function compileMatch(mode, _parent) {
      if (!mode.match) return;
      if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
      mode.begin = mode.match;
      delete mode.match;
    }
    function compileRelevance(mode, _parent) {
      if (mode.relevance === void 0) mode.relevance = 1;
    }
    var beforeMatchExt = (mode, parent) => {
      if (!mode.beforeMatch) return;
      if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
      const originalMode = Object.assign({}, mode);
      Object.keys(mode).forEach((key2) => {
        delete mode[key2];
      });
      mode.keywords = originalMode.keywords;
      mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
      mode.starts = {
        relevance: 0,
        contains: [
          Object.assign(originalMode, { endsParent: true })
        ]
      };
      mode.relevance = 0;
      delete originalMode.beforeMatch;
    };
    var COMMON_KEYWORDS = [
      "of",
      "and",
      "for",
      "in",
      "not",
      "or",
      "if",
      "then",
      "parent",
      // common variable name
      "list",
      // common variable name
      "value"
      // common variable name
    ];
    var DEFAULT_KEYWORD_SCOPE = "keyword";
    function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
      const compiledKeywords = /* @__PURE__ */ Object.create(null);
      if (typeof rawKeywords === "string") {
        compileList(scopeName, rawKeywords.split(" "));
      } else if (Array.isArray(rawKeywords)) {
        compileList(scopeName, rawKeywords);
      } else {
        Object.keys(rawKeywords).forEach(function(scopeName2) {
          Object.assign(
            compiledKeywords,
            compileKeywords(rawKeywords[scopeName2], caseInsensitive, scopeName2)
          );
        });
      }
      return compiledKeywords;
      function compileList(scopeName2, keywordList) {
        if (caseInsensitive) {
          keywordList = keywordList.map((x) => x.toLowerCase());
        }
        keywordList.forEach(function(keyword) {
          const pair = keyword.split("|");
          compiledKeywords[pair[0]] = [scopeName2, scoreForKeyword(pair[0], pair[1])];
        });
      }
    }
    function scoreForKeyword(keyword, providedScore) {
      if (providedScore) {
        return Number(providedScore);
      }
      return commonKeyword(keyword) ? 0 : 1;
    }
    function commonKeyword(keyword) {
      return COMMON_KEYWORDS.includes(keyword.toLowerCase());
    }
    var seenDeprecations = {};
    var error = (message) => {
      console.error(message);
    };
    var warn = (message, ...args) => {
      console.log(`WARN: ${message}`, ...args);
    };
    var deprecated = (version2, message) => {
      if (seenDeprecations[`${version2}/${message}`]) return;
      console.log(`Deprecated as of ${version2}. ${message}`);
      seenDeprecations[`${version2}/${message}`] = true;
    };
    var MultiClassError = new Error();
    function remapScopeNames(mode, regexes, { key: key2 }) {
      let offset = 0;
      const scopeNames = mode[key2];
      const emit = {};
      const positions = {};
      for (let i = 1; i <= regexes.length; i++) {
        positions[i + offset] = scopeNames[i];
        emit[i + offset] = true;
        offset += countMatchGroups(regexes[i - 1]);
      }
      mode[key2] = positions;
      mode[key2]._emit = emit;
      mode[key2]._multi = true;
    }
    function beginMultiClass(mode) {
      if (!Array.isArray(mode.begin)) return;
      if (mode.skip || mode.excludeBegin || mode.returnBegin) {
        error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
        error("beginScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.begin, { key: "beginScope" });
      mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
    }
    function endMultiClass(mode) {
      if (!Array.isArray(mode.end)) return;
      if (mode.skip || mode.excludeEnd || mode.returnEnd) {
        error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.endScope !== "object" || mode.endScope === null) {
        error("endScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.end, { key: "endScope" });
      mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
    }
    function scopeSugar(mode) {
      if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
        mode.beginScope = mode.scope;
        delete mode.scope;
      }
    }
    function MultiClass(mode) {
      scopeSugar(mode);
      if (typeof mode.beginScope === "string") {
        mode.beginScope = { _wrap: mode.beginScope };
      }
      if (typeof mode.endScope === "string") {
        mode.endScope = { _wrap: mode.endScope };
      }
      beginMultiClass(mode);
      endMultiClass(mode);
    }
    function compileLanguage(language) {
      function langRe(value, global) {
        return new RegExp(
          source(value),
          "m" + (language.case_insensitive ? "i" : "") + (language.unicodeRegex ? "u" : "") + (global ? "g" : "")
        );
      }
      class MultiRegex {
        constructor() {
          this.matchIndexes = {};
          this.regexes = [];
          this.matchAt = 1;
          this.position = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          opts.position = this.position++;
          this.matchIndexes[this.matchAt] = opts;
          this.regexes.push([opts, re]);
          this.matchAt += countMatchGroups(re) + 1;
        }
        compile() {
          if (this.regexes.length === 0) {
            this.exec = () => null;
          }
          const terminators = this.regexes.map((el) => el[1]);
          this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: "|" }), true);
          this.lastIndex = 0;
        }
        /** @param {string} s */
        exec(s) {
          this.matcherRe.lastIndex = this.lastIndex;
          const match = this.matcherRe.exec(s);
          if (!match) {
            return null;
          }
          const i = match.findIndex((el, i2) => i2 > 0 && el !== void 0);
          const matchData = this.matchIndexes[i];
          match.splice(0, i);
          return Object.assign(match, matchData);
        }
      }
      class ResumableMultiRegex {
        constructor() {
          this.rules = [];
          this.multiRegexes = [];
          this.count = 0;
          this.lastIndex = 0;
          this.regexIndex = 0;
        }
        // @ts-ignore
        getMatcher(index) {
          if (this.multiRegexes[index]) return this.multiRegexes[index];
          const matcher = new MultiRegex();
          this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
          matcher.compile();
          this.multiRegexes[index] = matcher;
          return matcher;
        }
        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }
        considerAll() {
          this.regexIndex = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          this.rules.push([re, opts]);
          if (opts.type === "begin") this.count++;
        }
        /** @param {string} s */
        exec(s) {
          const m = this.getMatcher(this.regexIndex);
          m.lastIndex = this.lastIndex;
          let result = m.exec(s);
          if (this.resumingScanAtSamePosition()) {
            if (result && result.index === this.lastIndex) ;
            else {
              const m2 = this.getMatcher(0);
              m2.lastIndex = this.lastIndex + 1;
              result = m2.exec(s);
            }
          }
          if (result) {
            this.regexIndex += result.position + 1;
            if (this.regexIndex === this.count) {
              this.considerAll();
            }
          }
          return result;
        }
      }
      function buildModeRegex(mode) {
        const mm = new ResumableMultiRegex();
        mode.contains.forEach((term) => mm.addRule(term.begin, { rule: term, type: "begin" }));
        if (mode.terminatorEnd) {
          mm.addRule(mode.terminatorEnd, { type: "end" });
        }
        if (mode.illegal) {
          mm.addRule(mode.illegal, { type: "illegal" });
        }
        return mm;
      }
      function compileMode(mode, parent) {
        const cmode = (
          /** @type CompiledMode */
          mode
        );
        if (mode.isCompiled) return cmode;
        [
          scopeClassName,
          // do this early so compiler extensions generally don't have to worry about
          // the distinction between match/begin
          compileMatch,
          MultiClass,
          beforeMatchExt
        ].forEach((ext) => ext(mode, parent));
        language.compilerExtensions.forEach((ext) => ext(mode, parent));
        mode.__beforeBegin = null;
        [
          beginKeywords,
          // do this later so compiler extensions that come earlier have access to the
          // raw array if they wanted to perhaps manipulate it, etc.
          compileIllegal,
          // default to 1 relevance if not specified
          compileRelevance
        ].forEach((ext) => ext(mode, parent));
        mode.isCompiled = true;
        let keywordPattern = null;
        if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
          mode.keywords = Object.assign({}, mode.keywords);
          keywordPattern = mode.keywords.$pattern;
          delete mode.keywords.$pattern;
        }
        keywordPattern = keywordPattern || /\w+/;
        if (mode.keywords) {
          mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
        }
        cmode.keywordPatternRe = langRe(keywordPattern, true);
        if (parent) {
          if (!mode.begin) mode.begin = /\B|\b/;
          cmode.beginRe = langRe(cmode.begin);
          if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
          if (mode.end) cmode.endRe = langRe(cmode.end);
          cmode.terminatorEnd = source(cmode.end) || "";
          if (mode.endsWithParent && parent.terminatorEnd) {
            cmode.terminatorEnd += (mode.end ? "|" : "") + parent.terminatorEnd;
          }
        }
        if (mode.illegal) cmode.illegalRe = langRe(
          /** @type {RegExp | string} */
          mode.illegal
        );
        if (!mode.contains) mode.contains = [];
        mode.contains = [].concat(...mode.contains.map(function(c) {
          return expandOrCloneMode(c === "self" ? mode : c);
        }));
        mode.contains.forEach(function(c) {
          compileMode(
            /** @type Mode */
            c,
            cmode
          );
        });
        if (mode.starts) {
          compileMode(mode.starts, parent);
        }
        cmode.matcher = buildModeRegex(cmode);
        return cmode;
      }
      if (!language.compilerExtensions) language.compilerExtensions = [];
      if (language.contains && language.contains.includes("self")) {
        throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
      }
      language.classNameAliases = inherit$1(language.classNameAliases || {});
      return compileMode(
        /** @type Mode */
        language
      );
    }
    function dependencyOnParent(mode) {
      if (!mode) return false;
      return mode.endsWithParent || dependencyOnParent(mode.starts);
    }
    function expandOrCloneMode(mode) {
      if (mode.variants && !mode.cachedVariants) {
        mode.cachedVariants = mode.variants.map(function(variant) {
          return inherit$1(mode, { variants: null }, variant);
        });
      }
      if (mode.cachedVariants) {
        return mode.cachedVariants;
      }
      if (dependencyOnParent(mode)) {
        return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
      }
      if (Object.isFrozen(mode)) {
        return inherit$1(mode);
      }
      return mode;
    }
    var version = "11.12.0";
    var HTMLInjectionError = class extends Error {
      constructor(reason, html) {
        super(reason);
        this.name = "HTMLInjectionError";
        this.html = html;
      }
    };
    var escape = escapeHTML;
    var inherit = inherit$1;
    var NO_MATCH = Symbol("nomatch");
    var MAX_KEYWORD_HITS = 7;
    var HLJS = function(hljs) {
      const languages = /* @__PURE__ */ Object.create(null);
      const aliases = /* @__PURE__ */ Object.create(null);
      const plugins = [];
      let SAFE_MODE = true;
      const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
      const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: "Plain text", contains: [] };
      let options = {
        ignoreUnescapedHTML: false,
        throwUnescapedHTML: false,
        noHighlightRe: /^(no-?highlight)$/i,
        languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
        classPrefix: "hljs-",
        cssSelector: "pre code",
        languages: null,
        // beta configuration options, subject to change, welcome to discuss
        // https://github.com/highlightjs/highlight.js/issues/1086
        __emitter: TokenTreeEmitter
      };
      function shouldNotHighlight(languageName) {
        return options.noHighlightRe.test(languageName);
      }
      function blockLanguage(block) {
        let classes = block.className + " ";
        classes += block.parentNode ? block.parentNode.className : "";
        const match = options.languageDetectRe.exec(classes);
        if (match) {
          const language = getLanguage(match[1]);
          if (!language) {
            warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            warn("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : "no-highlight";
        }
        return classes.split(/\s+/).find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
      }
      function highlight2(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
        let code = "";
        let languageName = "";
        if (typeof optionsOrCode === "object") {
          code = codeOrLanguageName;
          ignoreIllegals = optionsOrCode.ignoreIllegals;
          languageName = optionsOrCode.language;
        } else {
          deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
          deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
          languageName = codeOrLanguageName;
          code = optionsOrCode;
        }
        if (ignoreIllegals === void 0) {
          ignoreIllegals = true;
        }
        const context = {
          code,
          language: languageName
        };
        fire("before:highlight", context);
        const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
        result.code = context.code;
        fire("after:highlight", result);
        return result;
      }
      function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
        const keywordHits = /* @__PURE__ */ Object.create(null);
        function keywordData(mode, matchText) {
          return mode.keywords[matchText];
        }
        function processKeywords() {
          if (!top.keywords) {
            emitter.addText(modeBuffer);
            return;
          }
          let lastIndex = 0;
          top.keywordPatternRe.lastIndex = 0;
          let match = top.keywordPatternRe.exec(modeBuffer);
          let buf = "";
          while (match) {
            buf += modeBuffer.substring(lastIndex, match.index);
            const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
            const data = keywordData(top, word);
            if (data) {
              const [kind, keywordRelevance] = data;
              emitter.addText(buf);
              buf = "";
              keywordHits[word] = (keywordHits[word] || 0) + 1;
              if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
              if (kind.startsWith("_")) {
                buf += match[0];
              } else {
                const cssClass = language.classNameAliases[kind] || kind;
                emitKeyword(match[0], cssClass);
              }
            } else {
              buf += match[0];
            }
            lastIndex = top.keywordPatternRe.lastIndex;
            match = top.keywordPatternRe.exec(modeBuffer);
          }
          buf += modeBuffer.substring(lastIndex);
          emitter.addText(buf);
        }
        function processSubLanguage() {
          if (modeBuffer === "") return;
          let result2 = null;
          if (typeof top.subLanguage === "string") {
            if (!languages[top.subLanguage]) {
              emitter.addText(modeBuffer);
              return;
            }
            result2 = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
            continuations[top.subLanguage] = /** @type {CompiledMode} */
            result2._top;
          } else {
            result2 = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
          }
          if (top.relevance > 0) {
            relevance += result2.relevance;
          }
          emitter.__addSublanguage(result2._emitter, result2.language);
        }
        function processBuffer() {
          if (top.subLanguage != null) {
            processSubLanguage();
          } else {
            processKeywords();
          }
          modeBuffer = "";
        }
        function emitKeyword(keyword, scope) {
          if (keyword === "") return;
          emitter.startScope(scope);
          emitter.addText(keyword);
          emitter.endScope();
        }
        function emitMultiClass(scope, match) {
          let i = 1;
          const max = match.length - 1;
          while (i <= max) {
            if (!scope._emit[i]) {
              i++;
              continue;
            }
            const klass = language.classNameAliases[scope[i]] || scope[i];
            const text = match[i];
            if (klass) {
              emitKeyword(text, klass);
            } else {
              modeBuffer = text;
              processKeywords();
              modeBuffer = "";
            }
            i++;
          }
        }
        function startNewMode(mode, match) {
          if (mode.scope && typeof mode.scope === "string") {
            emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
          }
          if (mode.beginScope) {
            if (mode.beginScope._wrap) {
              emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
              modeBuffer = "";
            } else if (mode.beginScope._multi) {
              emitMultiClass(mode.beginScope, match);
              modeBuffer = "";
            }
          }
          top = Object.create(mode, { parent: { value: top } });
          return top;
        }
        function endOfMode(mode, match, matchPlusRemainder) {
          let matched = startsWith(mode.endRe, matchPlusRemainder);
          if (matched) {
            if (mode["on:end"]) {
              const resp = new Response(mode);
              mode["on:end"](match, resp);
              if (resp.isMatchIgnored) matched = false;
            }
            if (matched) {
              while (mode.endsParent && mode.parent) {
                mode = mode.parent;
              }
              return mode;
            }
          }
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, match, matchPlusRemainder);
          }
        }
        function doIgnore(lexeme) {
          if (top.matcher.regexIndex === 0) {
            modeBuffer += lexeme[0];
            return 1;
          } else {
            resumeScanAtSamePosition = true;
            return 0;
          }
        }
        function doBeginMatch(match) {
          const lexeme = match[0];
          const newMode = match.rule;
          const resp = new Response(newMode);
          const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
          for (const cb of beforeCallbacks) {
            if (!cb) continue;
            cb(match, resp);
            if (resp.isMatchIgnored) return doIgnore(lexeme);
          }
          if (newMode.skip) {
            modeBuffer += lexeme;
          } else {
            if (newMode.excludeBegin) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (!newMode.returnBegin && !newMode.excludeBegin) {
              modeBuffer = lexeme;
            }
          }
          startNewMode(newMode, match);
          return newMode.returnBegin ? 0 : lexeme.length;
        }
        function doEndMatch(match) {
          const lexeme = match[0];
          const matchPlusRemainder = codeToHighlight.substring(match.index);
          const endMode = endOfMode(top, match, matchPlusRemainder);
          if (!endMode) {
            return NO_MATCH;
          }
          const origin = top;
          if (top.endScope && top.endScope._wrap) {
            processBuffer();
            emitKeyword(lexeme, top.endScope._wrap);
          } else if (top.endScope && top.endScope._multi) {
            processBuffer();
            emitMultiClass(top.endScope, match);
          } else if (origin.skip) {
            modeBuffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              modeBuffer = lexeme;
            }
          }
          do {
            if (top.scope) {
              emitter.closeNode();
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== endMode.parent);
          if (endMode.starts) {
            startNewMode(endMode.starts, match);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }
        function processContinuations() {
          const list = [];
          for (let current = top; current !== language; current = current.parent) {
            if (current.scope) {
              list.unshift(current.scope);
            }
          }
          list.forEach((item) => emitter.openNode(item));
        }
        let lastMatch = {};
        function processLexeme(textBeforeMatch, match) {
          const lexeme = match && match[0];
          modeBuffer += textBeforeMatch;
          if (lexeme == null) {
            processBuffer();
            return 0;
          }
          if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
            modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
            if (!SAFE_MODE) {
              const err = new Error(`0 width match regex (${languageName})`);
              err.languageName = languageName;
              err.badRule = lastMatch.rule;
              throw err;
            }
            return 1;
          }
          lastMatch = match;
          if (match.type === "begin") {
            return doBeginMatch(match);
          } else if (match.type === "illegal" && !ignoreIllegals) {
            const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || "<unnamed>") + '"');
            err.mode = top;
            throw err;
          } else if (match.type === "end") {
            const processed = doEndMatch(match);
            if (processed !== NO_MATCH) {
              return processed;
            }
          }
          if (match.type === "illegal" && lexeme === "") {
            if (match.index === codeToHighlight.length) ;
            else {
              modeBuffer += "\n";
            }
            return 1;
          }
          if (iterations > 1e5 && iterations > match.index * 3) {
            const err = new Error("potential infinite loop, way more iterations than matches");
            throw err;
          }
          modeBuffer += lexeme;
          return lexeme.length;
        }
        const language = getLanguage(languageName);
        if (!language) {
          error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
          throw new Error('Unknown language: "' + languageName + '"');
        }
        const md = compileLanguage(language);
        let result = "";
        let top = continuation || md;
        const continuations = {};
        const emitter = new options.__emitter(options);
        processContinuations();
        let modeBuffer = "";
        let relevance = 0;
        let index = 0;
        let iterations = 0;
        let resumeScanAtSamePosition = false;
        try {
          if (!language.__emitTokens) {
            top.matcher.considerAll();
            for (; ; ) {
              iterations++;
              if (resumeScanAtSamePosition) {
                resumeScanAtSamePosition = false;
              } else {
                top.matcher.considerAll();
              }
              top.matcher.lastIndex = index;
              const match = top.matcher.exec(codeToHighlight);
              if (!match) break;
              const beforeMatch = codeToHighlight.substring(index, match.index);
              const processedCount = processLexeme(beforeMatch, match);
              index = match.index + processedCount;
            }
            processLexeme(codeToHighlight.substring(index));
          } else {
            language.__emitTokens(codeToHighlight, emitter);
          }
          emitter.finalize();
          result = emitter.toHTML();
          return {
            language: languageName,
            value: result,
            relevance,
            illegal: false,
            _emitter: emitter,
            _top: top
          };
        } catch (err) {
          if (err.message && err.message.includes("Illegal")) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: true,
              relevance: 0,
              _illegalBy: {
                message: err.message,
                index,
                context: codeToHighlight.slice(index - 100, index + 100),
                mode: err.mode,
                resultSoFar: result
              },
              _emitter: emitter
            };
          } else if (SAFE_MODE) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: false,
              relevance: 0,
              errorRaised: err,
              _emitter: emitter,
              _top: top
            };
          } else {
            throw err;
          }
        }
      }
      function justTextHighlightResult(code) {
        const result = {
          value: escape(code),
          illegal: false,
          relevance: 0,
          _top: PLAINTEXT_LANGUAGE,
          _emitter: new options.__emitter(options)
        };
        result._emitter.addText(code);
        return result;
      }
      function highlightAuto(code, languageSubset) {
        languageSubset = languageSubset || options.languages || Object.keys(languages);
        const plaintext2 = justTextHighlightResult(code);
        const results = languageSubset.filter(getLanguage).filter(autoDetection).map(
          (name) => _highlight(name, code, false)
        );
        results.unshift(plaintext2);
        const sorted = results.sort((a, b) => {
          if (a.relevance !== b.relevance) return b.relevance - a.relevance;
          if (a.language && b.language) {
            if (getLanguage(a.language).supersetOf === b.language) {
              return 1;
            } else if (getLanguage(b.language).supersetOf === a.language) {
              return -1;
            }
          }
          return 0;
        });
        const [best, secondBest] = sorted;
        const result = best;
        result.secondBest = secondBest;
        return result;
      }
      function updateClassName(element, currentLang, resultLang) {
        const language = currentLang && aliases[currentLang] || resultLang;
        element.classList.add("hljs");
        element.classList.add(`language-${language}`);
      }
      function highlightElement(element) {
        let node = null;
        const language = blockLanguage(element);
        if (shouldNotHighlight(language)) return;
        fire(
          "before:highlightElement",
          { el: element, language }
        );
        if (element.dataset.highlighted) {
          console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
          return;
        }
        if (element.children.length > 0) {
          if (!options.ignoreUnescapedHTML) {
            console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
            console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
            console.warn("The element with unescaped HTML:");
            console.warn(element);
          }
          if (options.throwUnescapedHTML) {
            const err = new HTMLInjectionError(
              "One of your code blocks includes unescaped HTML.",
              element.innerHTML
            );
            throw err;
          }
        }
        node = element;
        const text = node.textContent;
        const result = language ? highlight2(text, { language, ignoreIllegals: true }) : highlightAuto(text);
        element.innerHTML = result.value;
        element.dataset.highlighted = "yes";
        updateClassName(element, language, result.language);
        element.result = {
          language: result.language,
          // TODO: remove with version 11.0
          re: result.relevance,
          relevance: result.relevance
        };
        if (result.secondBest) {
          element.secondBest = {
            language: result.secondBest.language,
            relevance: result.secondBest.relevance
          };
        }
        fire("after:highlightElement", { el: element, result, text });
      }
      function configure(userOptions) {
        options = inherit(options, userOptions);
      }
      const initHighlighting = () => {
        highlightAll();
        deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
      };
      function initHighlightingOnLoad() {
        highlightAll();
        deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
      }
      let wantsHighlight = false;
      function highlightAll() {
        function boot() {
          highlightAll();
        }
        if (document.readyState === "loading") {
          if (!wantsHighlight) {
            window.addEventListener("DOMContentLoaded", boot, false);
          }
          wantsHighlight = true;
          return;
        }
        const blocks = document.querySelectorAll(options.cssSelector);
        blocks.forEach(highlightElement);
      }
      function registerLanguage(languageName, languageDefinition) {
        let lang = null;
        try {
          lang = languageDefinition(hljs);
        } catch (error$1) {
          error("Language definition for '{}' could not be registered.".replace("{}", languageName));
          if (!SAFE_MODE) {
            throw error$1;
          } else {
            error(error$1);
          }
          lang = PLAINTEXT_LANGUAGE;
        }
        if (!lang.name) lang.name = languageName;
        languages[languageName] = lang;
        lang.rawDefinition = languageDefinition.bind(null, hljs);
        if (lang.aliases) {
          registerAliases(lang.aliases, { languageName });
        }
      }
      function unregisterLanguage(languageName) {
        delete languages[languageName];
        for (const alias of Object.keys(aliases)) {
          if (aliases[alias] === languageName) {
            delete aliases[alias];
          }
        }
      }
      function listLanguages() {
        return Object.keys(languages);
      }
      function getLanguage(name) {
        name = (name || "").toLowerCase();
        return languages[name] || languages[aliases[name]];
      }
      function registerAliases(aliasList, { languageName }) {
        if (typeof aliasList === "string") {
          aliasList = [aliasList];
        }
        aliasList.forEach((alias) => {
          aliases[alias.toLowerCase()] = languageName;
        });
      }
      function autoDetection(name) {
        const lang = getLanguage(name);
        return lang && !lang.disableAutodetect;
      }
      function upgradePluginAPI(plugin) {
        if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
          plugin["before:highlightElement"] = (data) => {
            plugin["before:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
        if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
          plugin["after:highlightElement"] = (data) => {
            plugin["after:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
      }
      function addPlugin(plugin) {
        upgradePluginAPI(plugin);
        plugins.push(plugin);
      }
      function removePlugin(plugin) {
        const index = plugins.indexOf(plugin);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
      }
      function fire(event, args) {
        const cb = event;
        plugins.forEach(function(plugin) {
          if (plugin[cb]) {
            plugin[cb](args);
          }
        });
      }
      function deprecateHighlightBlock(el) {
        deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
        deprecated("10.7.0", "Please use highlightElement now.");
        return highlightElement(el);
      }
      Object.assign(hljs, {
        highlight: highlight2,
        highlightAuto,
        highlightAll,
        highlightElement,
        // TODO: Remove with v12 API
        highlightBlock: deprecateHighlightBlock,
        configure,
        initHighlighting,
        initHighlightingOnLoad,
        registerLanguage,
        unregisterLanguage,
        listLanguages,
        getLanguage,
        registerAliases,
        autoDetection,
        inherit,
        addPlugin,
        removePlugin
      });
      hljs.debugMode = function() {
        SAFE_MODE = false;
      };
      hljs.safeMode = function() {
        SAFE_MODE = true;
      };
      hljs.versionString = version;
      hljs.regex = {
        concat,
        lookahead,
        either,
        optional,
        anyNumberOfTimes
      };
      for (const key2 in MODES2) {
        if (typeof MODES2[key2] === "object") {
          deepFreeze(MODES2[key2]);
        }
      }
      Object.assign(hljs, MODES2);
      return hljs;
    };
    var highlight = HLJS({});
    highlight.newInstance = () => HLJS({});
    module2.exports = highlight;
    highlight.HighlightJS = highlight;
    highlight.default = highlight;
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinearPrsPlugin
});
module.exports = __toCommonJS(main_exports);

// src/merge-activity.ts
function mergeWindow(now = /* @__PURE__ */ new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 13);
  return start;
}
function dailyMerges(mergedDates, now = /* @__PURE__ */ new Date()) {
  const start = mergeWindow(now);
  const days = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    days.push({ date: dayKey(day), count: 0 });
  }
  for (const value of mergedDates) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date > now) {
      continue;
    }
    const day = days.find((day2) => day2.date === dayKey(date));
    if (day) {
      day.count++;
    }
  }
  return days;
}
function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function activitySummary(metadata, now = /* @__PURE__ */ new Date()) {
  const today = metadata.mergeActivity?.find((day) => day.date === dayKey(now));
  const hidden = new Set(metadata.hidden);
  const open = new Set(
    metadata.pullRequests.filter(
      (pullRequest) => !hidden.has(pullRequest.id) && ["open", "draft"].includes(pullRequest.state)
    ).map((pullRequest) => pullRequest.id)
  ).size;
  return `${today?.count ?? "\u2014"} merged today, ${metadata.lastRefresh ? open : "\u2014"} open PRs`;
}

// src/api/transport.ts
var import_obsidian = require("obsidian");

// src/api/request-queue.ts
var clock = {
  now: () => Date.now(),
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
};
var RequestQueue = class {
  constructor(service, timing = clock) {
    this.service = service;
    this.timing = timing;
  }
  tail = Promise.resolve();
  nextRequest = 0;
  cooldown = 0;
  run(request, options) {
    const task = this.tail.then(() => this.request(request, options));
    this.tail = task.catch(() => {
    });
    return task;
  }
  rateLimitError() {
    return new Error(
      `${this.service} rate limit: requests paused until ${new Date(this.cooldown).toLocaleTimeString()}. Your cached board is retained.`
    );
  }
  async request(request, options) {
    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(this.nextRequest, this.cooldown) - this.timing.now();
      if (wait > 12e4) {
        throw this.rateLimitError();
      }
      if (wait > 0) {
        await this.timing.sleep(wait);
      }
      const response = await request();
      this.nextRequest = this.timing.now() + 250;
      const headers = Object.fromEntries(
        Object.entries(response.headers ?? {}).map(([key2, value]) => [
          key2.toLowerCase(),
          value
        ])
      );
      const payload = response.json;
      const messages = [
        payload?.message,
        ...(payload?.errors ?? []).map((error) => error.message)
      ].filter(Boolean).join("; ");
      const limited = response.status === 429 || response.status === 403 && headers["x-ratelimit-remaining"] === "0" || payload?.errors?.some(
        (error) => ["RATE_LIMITED", "RATELIMITED"].includes(
          error.type ?? error.extensions?.code ?? ""
        )
      ) || (response.status === 403 || !!payload?.errors?.length) && /rate.?limit|secondary rate|abuse detection/i.test(messages);
      const resets = [];
      for (const [remaining, reset, multiplier] of [
        ["x-ratelimit-remaining", "x-ratelimit-reset", 1e3],
        ["x-ratelimit-requests-remaining", "x-ratelimit-requests-reset", 1],
        ["x-ratelimit-complexity-remaining", "x-ratelimit-complexity-reset", 1],
        [
          "x-ratelimit-endpoint-requests-remaining",
          "x-ratelimit-endpoint-requests-reset",
          1
        ]
      ]) {
        if (headers[remaining] === "0" && Number(headers[reset]) > 0) {
          resets.push(Number(headers[reset]) * multiplier);
        }
      }
      if (resets.length) {
        this.cooldown = Math.max(this.cooldown, ...resets);
      }
      if (limited) {
        const retryAfter = headers["retry-after"];
        const retryAt = retryAfter ? Number.isFinite(Number(retryAfter)) ? this.timing.now() + Number(retryAfter) * 1e3 : Date.parse(retryAfter) : NaN;
        this.cooldown = Math.max(
          this.cooldown,
          Number.isFinite(retryAt) ? retryAt : resets.length ? this.timing.now() : this.timing.now() + 6e4 * 2 ** attempt
        );
        if (!options.retry || attempt >= 2) {
          throw this.rateLimitError();
        }
        continue;
      }
      if (options.retry && [502, 503, 504].includes(response.status) && attempt < 2) {
        this.nextRequest = this.timing.now() + 1e3 * 2 ** attempt;
        continue;
      }
      return response;
    }
  }
};

// src/api/transport.ts
var queues = /* @__PURE__ */ new Map();
async function requestJson(url, method, token, body) {
  const host = new URL(url).hostname;
  let queue = queues.get(host);
  if (!queue) {
    queue = new RequestQueue(host === "api.github.com" ? "GitHub" : "Linear");
    queues.set(host, queue);
  }
  const query = body?.query;
  const retry = method === "GET" || method === "POST" && !!query && /^\s*query\b/.test(query);
  const res = await queue.run(
    async () => {
      const response = await (0, import_obsidian.requestUrl)({
        url,
        method,
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: body === void 0 ? void 0 : JSON.stringify(body),
        throw: false
      });
      let json2;
      try {
        json2 = response.json;
      } catch {
        json2 = null;
      }
      return {
        status: response.status,
        headers: response.headers,
        text: response.text,
        json: json2
      };
    },
    { retry }
  );
  if (res.status >= 400) {
    throw new Error(
      `${method} ${url}: ${res.status} ${JSON.stringify(res.json?.message ?? res.text).slice(0, 200)}`
    );
  }
  return res.json;
}
async function queryLinear(key2, query, variables = {}) {
  const data = await requestJson(
    "https://api.linear.app/graphql",
    "POST",
    key2,
    {
      query,
      variables
    }
  );
  if (data.errors?.length) {
    throw new Error(data.errors.map((e) => e.message).join("; "));
  }
  if (!data.data) {
    throw new Error("Linear returned no GraphQL data.");
  }
  return data.data;
}
async function requestGitHub(token, path, method = "GET", body) {
  return requestJson(`https://api.github.com${path}`, method, `Bearer ${token}`, body);
}
async function requestGitHubDiff(token, path) {
  const response = await (0, import_obsidian.requestUrl)({
    url: `https://api.github.com${path}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.diff",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    throw: false
  });
  if (response.status >= 400) {
    throw new Error(`GitHub diff: ${response.status} ${response.text.slice(0, 200)}`);
  }
  return response.text;
}

// src/pull-request-matching.ts
var prPattern = /https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;
function parsePullRequestUrl(url) {
  const m = url.match(prPattern);
  return m ? { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) } : null;
}
function referencedIdentifiers(pr) {
  return [
    ...new Set(
      ([pr.title ?? "", pr.body ?? "", pr.head?.ref ?? ""].join("\n").match(/\b[A-Z][A-Z0-9]{1,14}-\d+\b/gi) ?? []).map((id) => id.toUpperCase())
    )
  ];
}

// src/async.ts
async function forEachConcurrent(items, limit, fn) {
  let index = 0;
  let failed = false;
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!failed && index < items.length) {
        const item = items[index++];
        try {
          await fn(item);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    })
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") {
    throw failure.reason;
  }
}
async function withDeadline(task, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out. Try again.`)),
          milliseconds
        );
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

// src/api/snapshots.ts
var SNAPSHOT_BATCH_SIZE = 25;
var PAGE = "pageInfo { hasNextPage endCursor }";
var ACTOR = "author { login __typename }";
var CHECK_FIELDS = `__typename
  ... on CheckRun { id name status conclusion title summary }
  ... on StatusContext { context state description }`;
var FIELDS = `id number title body url state isDraft createdAt headRefOid headRefName
  baseRefName baseRef { target { oid } } mergeable autoMergeRequest { enabledAt }
  mergeQueueEntry { id }
  reviews(first:20) { nodes { ${ACTOR} state body } ${PAGE} }
  reviewRequests(first:20) { nodes { requestedReviewer { __typename ... on User { login } ... on Bot { login } } } ${PAGE} }
  comments(first:20) { nodes { ${ACTOR} } ${PAGE} }
  reviewThreads(first:10) { nodes { id comments(first:5) { nodes { ${ACTOR} } ${PAGE} } } ${PAGE} }
  statusCheckRollup { id contexts(first:50) { nodes { ${CHECK_FIELDS} } ${PAGE} } }`;
async function graphql(token, query, variables) {
  const result = await requestJson(
    "https://api.github.com/graphql",
    "POST",
    `Bearer ${token}`,
    { query, variables }
  );
  if (result.errors?.length) {
    throw new Error([...new Set(result.errors.map((error) => error.message))].join("; "));
  }
  if (!result.data) {
    throw new Error("GitHub returned no snapshot data.");
  }
  return result.data;
}
async function* connectionPages(token, id, type, field, fields, connection) {
  yield connection.nodes;
  let page = connection.pageInfo;
  while (page.hasNextPage) {
    if (!page.endCursor) {
      throw new Error(`Missing GitHub cursor for ${field}.`);
    }
    const result = await graphql(
      token,
      `query($id:ID!,$after:String!){node(id:$id){... on ${type}{${field}(first:100,after:$after){nodes{${fields}} ${PAGE}}}}}`,
      { id, after: page.endCursor }
    );
    const next = result.node[field];
    yield next.nodes;
    page = next.pageInfo;
  }
}
async function completeConnection(...parameters) {
  const nodes = [];
  for await (const page of connectionPages(...parameters)) {
    nodes.push(...page);
  }
  return nodes;
}
async function hasHumanComment(...parameters) {
  for await (const page of connectionPages(...parameters)) {
    if (page.some((comment) => comment.author?.__typename === "User")) {
      return true;
    }
  }
  return false;
}
async function fetchSnapshots(token, previous) {
  const snapshots = [];
  for (let start = 0; start < previous.length; start += SNAPSHOT_BATCH_SIZE) {
    const batch = previous.slice(start, start + SNAPSHOT_BATCH_SIZE);
    const fields = batch.map((pr, index) => {
      const [owner, name] = pr.repo.split("/");
      return `p${index}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){pullRequest(number:${pr.number}){${FIELDS}}}`;
    }).join("\n");
    const result = await graphql(
      token,
      `query RefreshPullRequestSnapshots {${fields}}`
    );
    await forEachConcurrent(batch, 4, async (previousPr) => {
      const index = batch.indexOf(previousPr);
      const snapshot = result[`p${index}`]?.pullRequest;
      if (!snapshot) {
        throw new Error(`GitHub did not return ${previousPr.id}.`);
      }
      snapshots.push(await normalizeSnapshot(token, previousPr, snapshot));
    });
  }
  return snapshots;
}
async function fetchAuthoredSnapshots(token, options = {}) {
  const snapshots = [];
  let after = null;
  do {
    const includeMerges = !!options.onMergedDates && after === null;
    const mergeQuery = `is:pr is:merged author:@me merged:>=${mergeWindow().toISOString().slice(0, 10)}`;
    const result = await graphql(
      token,
      `query AuthoredPullRequestSnapshots($after:String){search(query:"is:pr is:open author:@me",type:ISSUE,first:${SNAPSHOT_BATCH_SIZE},after:$after){issueCount nodes{... on PullRequest{${FIELDS}}} ${PAGE}} ${includeMerges ? `merged:search(query:${JSON.stringify(mergeQuery)},type:ISSUE,first:100){issueCount nodes{... on PullRequest{mergedAt}} ${PAGE}}` : ""}}`,
      { after }
    );
    if (includeMerges) {
      if (!result.merged || result.merged.issueCount > 1e3) {
        throw new Error("GitHub did not return complete merge activity.");
      }
      const dates = result.merged.nodes.map((pr) => pr.mergedAt);
      let page2 = result.merged.pageInfo;
      while (page2.hasNextPage) {
        if (!page2.endCursor) {
          throw new Error("Missing merge activity cursor.");
        }
        const next = await graphql(
          token,
          `query($after:String!){merged:search(query:${JSON.stringify(mergeQuery)},type:ISSUE,first:100,after:$after){nodes{... on PullRequest{mergedAt}} ${PAGE}}}`,
          { after: page2.endCursor }
        );
        dates.push(...next.merged.nodes.map((pr) => pr.mergedAt));
        page2 = next.merged.pageInfo;
      }
      options.onMergedDates?.(dates);
    }
    if (result.search.issueCount > 1e3) {
      throw new Error(
        "GitHub search exceeds its 1,000-result limit; cached board was retained."
      );
    }
    const page = result.search;
    await forEachConcurrent(page.nodes, 4, async (snapshot) => {
      const reference = parsePullRequestUrl(snapshot.url);
      if (!reference) {
        throw new Error(`Invalid GitHub PR URL: ${snapshot.url}`);
      }
      snapshots.push(
        await normalizeSnapshot(token, createPullRequestReference(reference), snapshot)
      );
    });
    if (page.pageInfo.hasNextPage && !page.pageInfo.endCursor) {
      throw new Error("Missing GitHub search cursor.");
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return snapshots;
}
function createPullRequestReference(reference) {
  return {
    ...reference,
    id: `${reference.repo}#${reference.number}`,
    url: `https://github.com/${reference.repo}/pull/${reference.number}`,
    title: "",
    draft: false,
    state: "open",
    createdAt: "",
    issueId: "",
    groupId: "unlinked",
    groupTitle: "",
    groupUrl: "",
    checks: [],
    reviewers: [],
    automerge: false,
    conflicts: false,
    comments: false
  };
}
async function normalizeSnapshot(token, previous, snapshot) {
  const remote = {
    number: snapshot.number,
    node_id: snapshot.id,
    html_url: snapshot.url,
    title: snapshot.title,
    body: snapshot.body,
    state: snapshot.state.toLowerCase(),
    draft: snapshot.isDraft,
    created_at: snapshot.createdAt,
    head: { sha: snapshot.headRefOid, ref: snapshot.headRefName },
    base: { sha: snapshot.baseRef?.target.oid ?? "", ref: snapshot.baseRefName },
    auto_merge: snapshot.autoMergeRequest,
    mergeable: snapshot.mergeable === "UNKNOWN" ? null : snapshot.mergeable === "MERGEABLE"
  };
  if (snapshot.state !== "OPEN") {
    return { remote, pullRequest: null };
  }
  const [reviews, requests, contexts] = await Promise.all([
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "reviews",
      `${ACTOR} state body`,
      snapshot.reviews
    ),
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "reviewRequests",
      "requestedReviewer { __typename ... on User { login } ... on Bot { login } }",
      snapshot.reviewRequests
    ),
    snapshot.statusCheckRollup ? completeConnection(
      token,
      snapshot.statusCheckRollup.id,
      "StatusCheckRollup",
      "contexts",
      CHECK_FIELDS,
      snapshot.statusCheckRollup.contexts
    ) : []
  ]);
  const reviewers = /* @__PURE__ */ new Map();
  for (const review of reviews) {
    if (!review.author || !["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"].includes(review.state)) {
      continue;
    }
    const previousState = reviewers.get(review.author.login);
    if (review.state === "COMMENTED" && previousState && previousState !== "commented") {
      continue;
    }
    reviewers.set(review.author.login, review.state.toLowerCase());
  }
  for (const request of requests) {
    if (request.requestedReviewer?.login && !reviewers.has(request.requestedReviewer.login)) {
      reviewers.set(request.requestedReviewer.login, "requested");
    }
  }
  let humanComments = reviews.some(
    (review) => review.author?.__typename === "User" && Boolean(review.body.trim())
  ) || snapshot.comments.nodes.some((comment) => comment.author?.__typename === "User") || snapshot.reviewThreads.nodes.some(
    (thread) => thread.comments.nodes.some((comment) => comment.author?.__typename === "User")
  );
  if (!humanComments) {
    humanComments = await hasHumanComment(
      token,
      snapshot.id,
      "PullRequest",
      "comments",
      ACTOR,
      snapshot.comments
    );
  }
  if (!humanComments) {
    for await (const threads of connectionPages(
      token,
      snapshot.id,
      "PullRequest",
      "reviewThreads",
      `id comments(first:5){nodes{${ACTOR}} ${PAGE}}`,
      snapshot.reviewThreads
    )) {
      for (const thread of threads) {
        humanComments = await hasHumanComment(
          token,
          thread.id,
          "PullRequestReviewThread",
          "comments",
          ACTOR,
          thread.comments
        );
        if (humanComments) {
          break;
        }
      }
      if (humanComments) {
        break;
      }
    }
  }
  const checks = [];
  for (const context of contexts) {
    const pending = context.__typename === "CheckRun" ? context.status !== "COMPLETED" : ["PENDING", "EXPECTED"].includes(context.state ?? "");
    const success = context.__typename === "CheckRun" ? ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(context.conclusion ?? "") : context.state === "SUCCESS";
    const status = pending ? "pending" : success ? "success" : "failure";
    const detail = [
      context.title !== context.name ? context.title : "",
      context.summary,
      context.text,
      context.description
    ].filter(Boolean).join(" \u2014 ").replace(/\s+/g, " ").trim().slice(0, 240);
    checks.push({
      name: context.name ?? context.context ?? "Check",
      status,
      detail: status === "failure" ? detail || context.conclusion?.toLowerCase().replace(/_/g, " ") : void 0
    });
  }
  return {
    remote,
    pullRequest: {
      ...previous,
      title: snapshot.title,
      url: snapshot.url,
      draft: snapshot.isDraft,
      state: snapshot.isDraft ? "draft" : "open",
      createdAt: snapshot.createdAt,
      automerge: Boolean(snapshot.autoMergeRequest),
      mergeQueued: Boolean(snapshot.mergeQueueEntry),
      conflicts: snapshot.mergeable === "CONFLICTING",
      reviewers: [...reviewers].map(([login, status]) => ({ login, status })),
      checks,
      comments: humanComments
    }
  };
}

// src/api/rebase.ts
async function rebasePullRequest(token, repo, pullRequest, options = {}) {
  try {
    if (pullRequest.mergeable === false) {
      throw new Error("The branch has merge conflicts with its base.");
    }
    const comparison = await compareWithCurrentBase(token, repo, pullRequest);
    if (!Number.isInteger(comparison.behind_by) || comparison.behind_by < 0) {
      throw new Error("GitHub did not return the branch comparison.");
    }
    if (comparison.behind_by === 0) {
      return { status: "up-to-date" };
    }
    const result = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${token}`,
      {
        query: `mutation($input:UpdatePullRequestBranchInput!){updatePullRequestBranch(input:$input){clientMutationId}}`,
        variables: {
          input: {
            pullRequestId: pullRequest.node_id,
            expectedHeadOid: pullRequest.head.sha,
            updateMethod: "REBASE"
          }
        }
      }
    );
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join("; "));
    }
    if (!result.data?.updatePullRequestBranch) {
      throw new Error("GitHub did not accept the branch rebase.");
    }
    const { attempts = 20, intervalMs = 1e3 } = options;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const current = await requestGitHub(
        token,
        `/repos/${repo}/pulls/${pullRequest.number}`
      );
      if (current.state !== "open") {
        throw new Error(
          `PR became ${current.state} before the rebase could be verified.`
        );
      }
      if (current.head.sha !== pullRequest.head.sha) {
        const comparison2 = await compareWithCurrentBase(token, repo, current);
        if (comparison2.behind_by === 0) {
          return { status: "updated", remote: current };
        }
      }
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error(
      "GitHub accepted the rebase, but the branch update did not complete within the verification window. Retry Launch to check again."
    );
  } catch (error) {
    return {
      status: "failed",
      warning: `Could not rebase: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
async function compareWithCurrentBase(token, repo, pullRequest) {
  const base = await requestGitHub(
    token,
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(pullRequest.base.ref)}`
  );
  if (!base.object?.sha) {
    throw new Error("GitHub did not return the current base branch.");
  }
  return requestGitHub(
    token,
    `/repos/${repo}/compare/${base.object.sha}...${pullRequest.head.sha}`
  );
}

// src/main.ts
var import_obsidian8 = require("obsidian");

// src/api/linear.ts
var ISSUE_FIELDS = "id identifier title url state { type } project { id name url } parent { id title url }";
var PAGE2 = "pageInfo { hasNextPage endCursor }";

// src/api/context.ts
async function resolveLinearContexts(key2, snapshots) {
  const open = snapshots.filter((snapshot) => snapshot.pullRequest !== null);
  const results = [];
  for (let start = 0; start < open.length; start += 25) {
    const batch = open.slice(start, start + 25);
    const identifiers = [
      ...new Set(batch.flatMap((snapshot) => referencedIdentifiers(snapshot.remote)))
    ];
    const validIdentifiers = identifiers.filter((identifier) => {
      const number = Number(identifier.slice(identifier.lastIndexOf("-") + 1));
      return Number.isSafeInteger(number) && number > 0 && number <= 2147483647;
    });
    const filters = validIdentifiers.map((identifier) => {
      const split = identifier.lastIndexOf("-");
      return {
        and: [
          { number: { eq: Number(identifier.slice(split + 1)) } },
          { team: { key: { eq: identifier.slice(0, split) } } }
        ]
      };
    });
    const fields = batch.map(
      (snapshot, index) => `p${index}:attachmentsForURL(url:${JSON.stringify(snapshot.remote.html_url)},first:5,includeArchived:true){nodes{issue{${ISSUE_FIELDS}}} ${PAGE2}}`
    ).join("\n");
    const response = await queryLinear(
      key2,
      `query ResolvePullRequestContexts${filters.length ? "($filter:IssueFilter!)" : ""}{${fields} ${filters.length ? `references:issues(first:100,includeArchived:true,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE2}}` : ""}}`,
      filters.length ? { filter: { or: filters } } : {}
    );
    const referenced = [...response.references?.nodes ?? []];
    let referencePage = response.references?.pageInfo;
    while (referencePage?.hasNextPage) {
      if (!referencePage.endCursor) {
        throw new Error("Missing Linear reference cursor.");
      }
      const next = await queryLinear(
        key2,
        `query($filter:IssueFilter!,$after:String!){issues(first:100,includeArchived:true,after:$after,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE2}}}`,
        { filter: { or: filters }, after: referencePage.endCursor }
      );
      referenced.push(...next.issues.nodes);
      referencePage = next.issues.pageInfo;
    }
    const issuesByIdentifier = new Map(
      referenced.map((issue) => [issue.identifier.toUpperCase(), issue])
    );
    for (const [index, snapshot] of batch.entries()) {
      const connection = response[`p${index}`];
      if (!connection) {
        throw new Error(`Missing Linear context for ${snapshot.remote.html_url}.`);
      }
      const attachments = [...connection.nodes];
      let page = connection.pageInfo;
      while (page.hasNextPage) {
        if (!page.endCursor) {
          throw new Error("Missing Linear attachment cursor.");
        }
        const next = await queryLinear(
          key2,
          `query($url:String!,$after:String!){attachmentsForURL(url:$url,first:100,includeArchived:true,after:$after){nodes{issue{${ISSUE_FIELDS}}} ${PAGE2}}}`,
          { url: snapshot.remote.html_url, after: page.endCursor }
        );
        attachments.push(...next.attachmentsForURL.nodes);
        page = next.attachmentsForURL.pageInfo;
      }
      const linked = attachments.map((attachment) => attachment.issue).filter((issue2) => !!issue2);
      const fallback = referencedIdentifiers(snapshot.remote).map((id) => issuesByIdentifier.get(id)).filter((issue2) => !!issue2);
      const source = linked.length ? "attachment" : fallback.length ? "reference" : "none";
      const issues = [
        ...new Map(
          (linked.length ? linked : fallback).map((issue2) => [issue2.id, issue2])
        ).values()
      ].sort((left, right) => left.identifier.localeCompare(right.identifier));
      const issue = issues[0];
      results.push({
        ...snapshot.pullRequest,
        linearContext: { issues, source },
        issueId: issue?.id ?? "",
        issueTitle: issue?.title,
        issueUrl: issue?.url,
        groupId: issue ? issue.parent?.id ?? issue.project?.id ?? "unparented" : "unlinked",
        groupTitle: issue ? issue.parent?.title ?? issue.project?.name ?? "Unparented issues" : "",
        groupUrl: issue ? issue.parent?.url ?? issue.project?.url ?? "" : ""
      });
    }
  }
  return results;
}

// src/api/discovery.ts
async function discover(credentials) {
  let mergedDates = [];
  const snapshots = await fetchAuthoredSnapshots(credentials.githubKey, {
    onMergedDates: (dates) => {
      mergedDates = dates;
    }
  });
  const prs = await resolveLinearContexts(credentials.linearKey, snapshots);
  return { prs, errors: [], mergedDates };
}
async function refreshPrs(credentials, previous) {
  const snapshots = await fetchSnapshots(credentials.githubKey, previous);
  return snapshots.map((snapshot) => snapshot.pullRequest).filter((pullRequest) => pullRequest !== null);
}

// src/metadata.ts
var BOARD_VIEW_TYPE = "linear-prs";
var METADATA_PATH = ".linear-prs/metadata.json";
var STAGES = ["A", "B", "C", "D", "E", "F"];
var DEFAULT_SETTINGS = {
  linearKey: "",
  githubKey: "",
  favoriteReviewers: ""
};
var createEmptyMetadata = () => ({
  version: 1,
  reviewTypes: {},
  stageNames: {},
  reviewMessage: [],
  searchHistory: [],
  mergeActivity: null,
  collapsed: [],
  selectedRepo: "",
  hidden: [],
  lastRefresh: "",
  pullRequests: []
});
function migrateMetadata(saved) {
  const { reviewTypes, ...fields } = saved;
  const metadata = { ...createEmptyMetadata(), ...fields };
  metadata.reviewTypes = Object.fromEntries(
    Object.entries(reviewTypes ?? {}).map(([id, stage]) => [
      id,
      stage === "review" ? "A" : stage === "stamp" ? "B" : stage
    ])
  );
  metadata.collapsed = metadata.collapsed.map((id) => {
    if (id === "queue:review") {
      return "queue:A";
    }
    if (id === "queue:stamp") {
      return "queue:B";
    }
    return id;
  });
  return metadata;
}
function stageTitle(metadata, stage) {
  const name = metadata.stageNames[stage];
  return `Staging ${stage}${name ? ` \xB7 ${name}` : ""}`;
}

// src/ui/elements.ts
var import_obsidian2 = require("obsidian");
var MERGE_QUEUE_PATH = "M3.75 4.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3 7.75a.75.75 0 0 1 1.5 0v2.878a2.251 2.251 0 1 1-1.5 0Zm.75 5.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5-7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5.75 2.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 0a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z";
function formatReviewMessage(pullRequests) {
  return [
    "Some prs to review:",
    "",
    ...pullRequests.map(
      (pullRequest, index) => `${index + 1}. ${pullRequest.title} ${pullRequest.url}`
    )
  ].join("\n");
}
function createIcon(parent, name, title, cls = "") {
  const element = parent.createSpan({ cls: `linear-prs-icon ${cls}` });
  if (name === "linear-prs-merge-queue") {
    element.addClass("linear-prs-merge-queue");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", MERGE_QUEUE_PATH);
    path.style.fill = "currentColor";
    path.style.stroke = "none";
    svg.appendChild(path);
    element.appendChild(svg);
  } else {
    (0, import_obsidian2.setIcon)(element, name);
  }
  if (title) {
    element.setAttr("title", title);
    element.setAttr("aria-label", title);
    element.setAttr("role", "img");
  }
  return element;
}
function createIconButton(parent, label, name, click, options = {}) {
  const { active = false, loading } = options;
  const buttonElement = parent.createEl("button", {
    cls: `linear-prs-button${active ? " is-active" : ""}${loading ? ` is-loading is-${loading === "spin" ? "spinning" : "pulsing"}` : ""}`,
    attr: { "aria-label": label, title: label, type: "button" }
  });
  if (loading) {
    buttonElement.disabled = true;
    buttonElement.setAttr("aria-busy", "true");
  }
  if (STAGES.includes(name)) {
    buttonElement.setText(name);
    buttonElement.addClass("linear-prs-stage-button");
  } else {
    (0, import_obsidian2.setIcon)(buttonElement, name);
  }
  buttonElement.onclick = (e) => {
    e.stopPropagation();
    click();
  };
  return buttonElement;
}
function formatOpenedDate(iso) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 36e5));
  if (hours < 1) {
    return "opened just now";
  }
  if (hours < 24) {
    return `opened ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `opened ${days} ${days === 1 ? "day" : "days"} ago`;
}
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

// src/preferences.ts
var import_obsidian3 = require("obsidian");
var Preferences = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const container = this.containerEl;
    container.empty();
    container.createEl("h2", { text: "Linear PRs" });
    new import_obsidian3.Setting(container).setName("Linear API key").setDesc("Personal API key for your Linear account.").addText((input) => {
      input.setPlaceholder("lin_api_\u2026").setValue(this.plugin.settings.linearKey).onChange(async (value) => {
        this.plugin.settings.linearKey = value.trim();
        await this.plugin.saveSettings();
      });
      input.inputEl.type = "password";
    });
    new import_obsidian3.Setting(container).setName("GitHub API key").setDesc("Personal access token with access to the linked repositories.").addText((input) => {
      input.setPlaceholder("github_pat_\u2026").setValue(this.plugin.settings.githubKey).onChange(async (value) => {
        this.plugin.settings.githubKey = value.trim();
        await this.plugin.saveSettings();
      });
      input.inputEl.type = "password";
    });
    new import_obsidian3.Setting(container).setName("Favorite reviewers").setDesc("Comma separated GitHub usernames shown in group actions.").addText(
      (input) => input.setPlaceholder("alice,bob").setValue(this.plugin.settings.favoriteReviewers).onChange(async (value) => {
        this.plugin.settings.favoriteReviewers = value;
        await this.plugin.saveSettings();
      })
    );
    container.createEl("p", {
      text: "Keys are saved in Obsidian plugin settings; board tracking is saved to .linear-prs/metadata.json in this vault.",
      cls: "setting-item-description"
    });
  }
};

// src/linear-issue-links.ts
function linearIssueLinks(pullRequest) {
  const issues = pullRequest.linearContext?.issues;
  if (issues?.length) {
    return [
      ...new Map(
        issues.map((issue) => [
          issue.identifier,
          { identifier: issue.identifier, title: issue.title, url: issue.url }
        ])
      ).values()
    ];
  }
  const identifier = pullRequest.issueUrl?.match(
    /\/issue\/([A-Z][A-Z0-9]*-\d+)(?:\/|$)/i
  )?.[1];
  return identifier && pullRequest.issueUrl ? [
    {
      identifier: identifier.toUpperCase(),
      title: pullRequest.issueTitle ?? identifier,
      url: pullRequest.issueUrl
    }
  ] : [];
}
function rememberSearch(history, query) {
  const term = query.trim();
  return term ? [
    term,
    ...history.filter((entry) => entry.toLowerCase() !== term.toLowerCase())
  ].slice(0, 10) : history;
}

// src/ui/pull-request-badges.ts
var import_obsidian4 = require("obsidian");
function renderPullRequestBadges(pullRequest, controls) {
  const badges = controls.createSpan({
    cls: "linear-prs-control-set linear-prs-badges"
  });
  createIcon(
    badges,
    "message-square",
    pullRequest.comments ? "Pull request has comments" : "Pull request has no comments",
    pullRequest.comments ? "orange" : "dim"
  );
  const reviewerTone = pullRequest.reviewers.some((r) => r.status === "approved") ? "good" : pullRequest.reviewers.some((r) => r.status === "dismissed") ? "orange" : "dim";
  createIcon(
    badges,
    "user",
    pullRequest.reviewers.length ? pullRequest.reviewers.map((r) => `${r.login}: ${r.status}`).join(", ") : "No reviewers assigned",
    reviewerTone
  );
  createIcon(
    badges,
    "git-merge",
    pullRequest.automerge ? "Automerge enabled" : "Automerge disabled",
    pullRequest.automerge ? "good" : "dim"
  );
  const failed = pullRequest.checks.filter((c) => c.status === "failure");
  const pending = pullRequest.checks.filter((c) => c.status === "pending");
  const checkStatus = pullRequest.conflicts || failed.length ? "bad" : pending.length ? "dim" : "good";
  const reasons = [
    ...pullRequest.conflicts ? ["Merge conflicts with the base branch"] : [],
    ...failed.slice(0, 8).map((c) => `${c.name}${c.detail ? `: ${c.detail}` : ""}`)
  ];
  if (failed.length > 8) {
    reasons.push(`And ${failed.length - 8} more failing checks`);
  }
  const checkTitle = checkStatus === "bad" ? `Why this PR is failing:
${reasons.join("\n")}` : checkStatus === "dim" ? `Checks pending:
${pending.map((c) => c.name).join("\n")}` : pullRequest.checks.length ? "All checks passing" : "No checks reported";
  const checkBadge = createIcon(
    badges,
    checkStatus === "bad" ? "circle-x" : checkStatus === "dim" ? "loader-circle" : "circle-check",
    void 0,
    checkStatus
  );
  checkBadge.setAttr("role", "img");
  checkBadge.setAttr("aria-label", checkTitle);
  (0, import_obsidian4.setTooltip)(checkBadge, checkTitle, {
    placement: "top",
    classes: ["linear-prs-check-tooltip"]
  });
}

// src/ui/board-view.ts
var import_obsidian5 = require("obsidian");

// src/api/github.ts
async function launchPr(credentials, pr, prefetched) {
  let data = prefetched ?? await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`
  );
  if (data.state !== "open") {
    throw new Error(`Pull request is ${data.state}, not open.`);
  }
  const rebase = await rebasePullRequest(credentials.githubKey, pr.repo, data);
  const branchUpdate = {
    rebaseStatus: rebase.status,
    warnings: rebase.warning ? [rebase.warning] : []
  };
  if (rebase.status === "updated") {
    data = rebase.remote ?? data;
    if (data.state !== "open") {
      throw new Error(`Pull request became ${data.state} after rebasing.`);
    }
  }
  if (data.draft) {
    const readyQuery = `mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}`;
    const ready = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${credentials.githubKey}`,
      { query: readyQuery, variables: { id: data.node_id } }
    );
    if (ready.errors?.length) {
      throw new Error(ready.errors.map((e) => e.message).join("; "));
    }
    if (ready.data?.markPullRequestReadyForReview?.pullRequest?.isDraft !== false) {
      throw new Error("GitHub did not mark the pull request ready for review.");
    }
  }
  if (data.auto_merge) {
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  }
  const autoMergeQuery = `mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  try {
    const result = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${credentials.githubKey}`,
      { query: autoMergeQuery, variables: { id: data.node_id } }
    );
    if (result.errors?.length) {
      throw new Error(
        result.errors.map((e) => e.message).join("; ")
      );
    }
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  } catch (e) {
    return {
      readyForReview: true,
      automergeEnabled: false,
      ...branchUpdate,
      error: `Ready for review, but auto-merge could not be enabled: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}
async function requestReviewer(credentials, pr, login) {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`,
    "POST",
    { reviewers: [login] }
  );
}
async function closePr(credentials, pr) {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`,
    "PATCH",
    {
      state: "closed"
    }
  );
}

// src/ui/board-view.ts
var BoardView = class extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  searchHistoryId = Math.random().toString(36).slice(2);
  busy = false;
  archived = false;
  search = "";
  searchInput = null;
  launching = /* @__PURE__ */ new Set();
  refreshingGroups = /* @__PURE__ */ new Set();
  getViewType() {
    return BOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Linear PRs";
  }
  getIcon() {
    return "git-pull-request";
  }
  async onOpen() {
    this.scope = new import_obsidian5.Scope(this.app.scope);
    this.scope.register([import_obsidian5.Platform.isMacOS ? "Meta" : "Ctrl"], "f", (event) => {
      event.preventDefault();
      this.focusSearch();
    });
    this.render();
  }
  focusSearch() {
    this.searchInput?.focus();
    this.searchInput?.select();
  }
  async runAction(fn, success) {
    try {
      await fn();
      new import_obsidian5.Notice(success);
      this.render();
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    }
  }
  async refresh() {
    if (this.busy || this.refreshingGroups.size || this.launching.size || !this.plugin.settings.linearKey || !this.plugin.settings.githubKey) {
      return;
    }
    this.busy = true;
    this.render();
    try {
      const r = await this.plugin.refresh();
      new import_obsidian5.Notice(
        `Linear PRs: ${r.prs.length} open PRs${r.errors.length ? `, ${r.errors.length} lookup errors` : ""}`
      );
      if (r.errors.length) {
        console.warn("Linear PR lookup errors", r.errors);
      }
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async refreshGroup(id, title) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.refreshingGroups.add(id);
    this.render();
    try {
      const r = await this.plugin.refreshGroup(id);
      new import_obsidian5.Notice(`${title}: refreshed ${r.prs.length} PRs`);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.refreshingGroups.delete(id);
      this.render();
    }
  }
  async refreshQueue(type, title) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    const key2 = `queue:${type}`;
    const metadata = this.plugin.metadata;
    const pullRequests = metadata.pullRequests.filter(
      (pullRequest) => !metadata.hidden.includes(pullRequest.id) && metadata.reviewTypes[pullRequest.id] === type
    );
    this.refreshingGroups.add(key2);
    this.render();
    try {
      const result = await this.plugin.refreshSelectedPrs(pullRequests);
      new import_obsidian5.Notice(`${title}: refreshed ${result.length} PRs`);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.refreshingGroups.delete(key2);
      this.render();
    }
  }
  rememberCollapse(fetchPullRequest, id) {
    const metadata = this.plugin.metadata;
    fetchPullRequest.open = !metadata.collapsed.includes(id);
    let lastOpen = fetchPullRequest.open;
    fetchPullRequest.ontoggle = () => {
      if (!fetchPullRequest.isConnected || fetchPullRequest.open === lastOpen) {
        return;
      }
      lastOpen = fetchPullRequest.open;
      metadata.collapsed = fetchPullRequest.open ? metadata.collapsed.filter((x) => x !== id) : [.../* @__PURE__ */ new Set([...metadata.collapsed, id])];
      void this.plugin.saveMetadata();
    };
  }
  getVisiblePullRequests() {
    const metadata = this.plugin.metadata;
    const query = this.search.trim().toLocaleLowerCase();
    return metadata.pullRequests.filter(
      (pullRequest) => this.archived ? metadata.hidden.includes(pullRequest.id) : !metadata.hidden.includes(pullRequest.id)
    ).filter(
      (pullRequest) => !query || [
        pullRequest.title,
        pullRequest.repo,
        String(pullRequest.number),
        pullRequest.id,
        ...linearIssueLinks(pullRequest).flatMap((issue) => [
          issue.identifier,
          issue.title
        ]),
        pullRequest.issueTitle,
        pullRequest.issueUrl,
        pullRequest.groupTitle
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  renderStagingSection(pullRequests, title, type, parent) {
    const fetchPullRequest = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest, `queue:${type}`);
    const summary = fetchPullRequest.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
    const heading = summary.createSpan({
      cls: "linear-prs-group-title linear-prs-stage-heading"
    });
    heading.createSpan({ text: `Staging ${type}` });
    const name = heading.createEl("input", {
      cls: "linear-prs-stage-name",
      attr: {
        type: "text",
        placeholder: "Name\u2026",
        "aria-label": `Name for Staging ${type}`,
        maxlength: "80"
      }
    });
    name.value = this.plugin.metadata.stageNames[type] ?? "";
    name.onclick = (event) => event.stopPropagation();
    name.onkeydown = (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        name.blur();
      }
      if (event.key === "Escape") {
        name.value = this.plugin.metadata.stageNames[type] ?? "";
        name.blur();
      }
    };
    name.onchange = () => {
      const value = name.value.trim();
      name.value = value;
      this.plugin.metadata.stageNames[type] = value;
      void this.plugin.saveMetadata().catch(
        (error) => new import_obsidian5.Notice(`Could not save section name: ${errorMessage(error)}`, 8e3)
      );
    };
    const tools = summary.createSpan({ cls: "linear-prs-actions" });
    tools.createSpan({ text: String(pullRequests.length), cls: "linear-prs-count" });
    const key2 = `queue:${type}`;
    const refresh = createIconButton(
      tools,
      `Refresh ${title}`,
      "refresh-cw",
      () => void this.refreshQueue(type, title),
      { loading: this.refreshingGroups.has(key2) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size && !this.refreshingGroups.has(key2)) {
      refresh.disabled = true;
    }
    createIconButton(
      tools,
      `Copy ${title}`,
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(pullRequests))
    );
    createIconButton(
      tools,
      `Launch ${title}`,
      "rocket",
      () => void this.launchMany(pullRequests),
      {
        loading: this.isLaunching(pullRequests) ? "pulse" : void 0
      }
    );
    const list = fetchPullRequest.createDiv({ cls: "linear-prs-list" });
    if (!pullRequests.length) {
      list.createDiv({ text: `No pull requests in ${title}`, cls: "linear-prs-empty" });
    } else {
      pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    }
  }
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      new import_obsidian5.Notice("Copied pull requests");
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e));
    }
  }
  async setStage(type, pullRequests) {
    pullRequests.forEach(
      (pullRequest) => this.plugin.metadata.reviewTypes[pullRequest.id] = type
    );
    await this.plugin.saveMetadata();
    this.render();
  }
  launchKey(pullRequests) {
    return pullRequests.map((pullRequest) => pullRequest.id).sort().join("");
  }
  isLaunching(pullRequests) {
    return this.launching.has(this.launchKey(pullRequests));
  }
  async launchMany(pullRequests) {
    if (!pullRequests.length) {
      return;
    }
    const key2 = this.launchKey(pullRequests);
    if (this.launching.has(key2)) {
      return;
    }
    this.launching.add(key2);
    this.render();
    let launched = 0;
    let readyOnly = 0;
    let rebasesCompleted = 0;
    const errors = [];
    try {
      const snapshots = await fetchSnapshots(
        this.plugin.credentials().githubKey,
        pullRequests
      );
      const current = new Map(
        snapshots.filter((snapshot) => snapshot.pullRequest).map((snapshot) => [snapshot.pullRequest.id, snapshot])
      );
      await forEachConcurrent(pullRequests, 3, async (pullRequest) => {
        try {
          const snapshot = current.get(pullRequest.id);
          if (!snapshot?.pullRequest) {
            throw new Error("Pull request is no longer open.");
          }
          const result = await launchPr(
            this.plugin.credentials(),
            pullRequest,
            snapshot.remote
          );
          if (result.rebaseStatus === "updated") {
            rebasesCompleted++;
          }
          errors.push(
            ...result.warnings.map((warning) => `${pullRequest.id}: ${warning}`)
          );
          pullRequest.draft = !result.readyForReview;
          pullRequest.automerge = result.automergeEnabled;
          if (result.automergeEnabled && result.rebaseStatus !== "failed") {
            launched++;
          } else if (!result.automergeEnabled) {
            readyOnly++;
            errors.push(
              `${pullRequest.repo}#${pullRequest.number}: ${result.error ?? "Ready for review, but auto-merge is disabled."}`
            );
          }
        } catch (e) {
          errors.push(`${pullRequest.repo}#${pullRequest.number}: ${errorMessage(e)}`);
        }
      });
      try {
        await this.plugin.refreshSelectedPrs(pullRequests);
      } catch (error) {
        errors.push(`Could not refresh launched PRs: ${errorMessage(error)}`);
      }
      await this.plugin.saveMetadata();
      const summary = `Launched ${launched}/${pullRequests.length} PRs${rebasesCompleted ? `; ${rebasesCompleted} branches rebased` : ""}${readyOnly ? `; ${readyOnly} ready without auto-merge` : ""}${errors.length ? `. ${errors.join("; ")}` : ""}`;
      new import_obsidian5.Notice(summary, errors.length ? 0 : 8e3);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.launching.delete(key2);
      this.render();
    }
  }
  renderReviewMessage(parent) {
    const metadata = this.plugin.metadata;
    const items = metadata.reviewMessage.map((id) => metadata.pullRequests.find((pullRequest) => pullRequest.id === id)).filter((pullRequest) => !!pullRequest);
    if (!items.length) {
      return;
    }
    const block = parent.createDiv({ cls: "linear-prs-review-block" });
    block.createEl("pre", { text: formatReviewMessage(items) });
    const actions = block.createDiv({ cls: "linear-prs-actions" });
    for (const stage of STAGES) {
      createIconButton(
        actions,
        `Move all to ${stageTitle(metadata, stage)}`,
        stage,
        () => void this.runAction(async () => {
          await this.setStage(stage, items);
          metadata.reviewMessage = [];
          await this.plugin.saveMetadata();
        }, `Moved to Staging ${stage}`)
      );
    }
    createIconButton(
      actions,
      "Launch review PRs",
      "rocket",
      () => void this.launchMany(items),
      {
        loading: this.isLaunching(items) ? "pulse" : void 0
      }
    );
    createIconButton(
      actions,
      "Copy review message",
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(items))
    );
    createIconButton(
      actions,
      "Clear review message",
      "trash-2",
      () => void this.runAction(async () => {
        metadata.reviewMessage = [];
        await this.plugin.saveMetadata();
      }, "Cleared review message")
    );
  }
  renderPullRequest(pullRequest, parent) {
    const row = parent.createDiv({ cls: "linear-prs-row" });
    const top = row.createDiv({ cls: "linear-prs-row-top" });
    const link = top.createEl("a", { href: pullRequest.url, cls: "linear-prs-title" });
    link.setAttr("target", "_blank");
    createIcon(
      link,
      pullRequest.mergeQueued ? "linear-prs-merge-queue" : pullRequest.draft ? "git-pull-request-draft" : "git-pull-request",
      pullRequest.mergeQueued ? "In merge queue" : pullRequest.draft ? "draft" : "open",
      pullRequest.mergeQueued ? "orange" : pullRequest.draft ? "dim" : "good"
    );
    link.createSpan({ text: pullRequest.title, cls: "linear-prs-title-text" });
    const controls = top.createSpan({ cls: "linear-prs-actions linear-prs-controls" });
    this.renderPullRequestActions(pullRequest, controls);
    renderPullRequestBadges(pullRequest, controls);
    this.renderPullRequestMetadata(pullRequest, row);
  }
  async refreshPullRequest(pullRequest) {
    if (this.busy || this.refreshingGroups.size || this.launching.size) {
      return;
    }
    const key2 = `pr:${pullRequest.id}`;
    this.refreshingGroups.add(key2);
    this.render();
    try {
      const result = await this.plugin.refreshPullRequest(pullRequest);
      const status = !result ? "PR is no longer open" : result.status === "updated" ? "refreshed and rebased" : result.status === "up-to-date" ? "refreshed; branch is up to date" : `refreshed; ${result.warning}`;
      new import_obsidian5.Notice(`${pullRequest.id}: ${status}`, result?.status === "failed" ? 0 : 8e3);
    } catch (error) {
      new import_obsidian5.Notice(`${pullRequest.id}: ${errorMessage(error)}`, 0);
    } finally {
      this.refreshingGroups.delete(key2);
      this.render();
    }
  }
  renderPullRequestActions(pullRequest, controls) {
    const metadata = this.plugin.metadata;
    const actions = controls.createSpan({ cls: "linear-prs-control-set" });
    createIconButton(
      actions,
      "Close and remove pull request",
      "trash-2",
      () => void this.runAction(async () => {
        await closePr(this.plugin.credentials(), pullRequest);
        metadata.hidden.push(pullRequest.id);
        await this.plugin.saveMetadata();
      }, "Closed and removed PR")
    );
    const key2 = `pr:${pullRequest.id}`;
    const refresh = createIconButton(
      actions,
      "Refresh and update pull request branch",
      "refresh-cw",
      () => void this.refreshPullRequest(pullRequest),
      { loading: this.refreshingGroups.has(key2) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size || this.launching.size) {
      refresh.disabled = true;
    }
    createIconButton(
      actions,
      "Add to review message",
      "copy",
      () => void this.runAction(async () => {
        if (!metadata.reviewMessage.includes(pullRequest.id)) {
          metadata.reviewMessage.push(pullRequest.id);
        }
        await this.plugin.saveMetadata();
        await navigator.clipboard.writeText(
          formatReviewMessage(
            metadata.reviewMessage.map((id) => metadata.pullRequests.find((x) => x.id === id)).filter((x) => !!x)
          )
        );
      }, "Added to review message")
    );
    const staging = controls.createSpan({ cls: "linear-prs-control-set" });
    for (const stage of STAGES) {
      createIconButton(
        staging,
        stageTitle(metadata, stage),
        stage,
        () => void this.runAction(
          () => this.setStage(
            metadata.reviewTypes[pullRequest.id] === stage ? "none" : stage,
            [pullRequest]
          ),
          "Updated staging"
        ),
        { active: metadata.reviewTypes[pullRequest.id] === stage }
      );
    }
  }
  renderPullRequestMetadata(pullRequest, row) {
    const meta = row.createDiv({ cls: "linear-prs-meta" });
    const refs = meta.createSpan({ cls: "linear-prs-meta-link" });
    for (const issue of linearIssueLinks(pullRequest)) {
      const pill = refs.createEl("a", {
        text: issue.identifier,
        href: issue.url,
        cls: "linear-prs-pill linear-prs-issue-id"
      });
      pill.setAttr("target", "_blank");
      pill.setAttr("title", `${issue.identifier}: ${issue.title}`);
    }
    const a = refs.createEl("a", { href: pullRequest.url, cls: "linear-prs-meta-link" });
    a.setAttr("target", "_blank");
    a.createSpan({ text: pullRequest.repo, cls: "linear-prs-pill" });
    const number = refs.createEl("a", {
      href: pullRequest.url,
      text: `#${pullRequest.number}`,
      cls: "linear-prs-pill"
    });
    number.setAttr("aria-label", `Open diff for pull request #${pullRequest.number}`);
    number.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.plugin.openPullRequestDiff(pullRequest);
    };
    meta.createSpan({
      text: formatOpenedDate(pullRequest.createdAt),
      cls: "linear-prs-date"
    });
  }
  renderGroup(pullRequests, id, title, url, parent) {
    const fetchPullRequest = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest, id);
    const summary = fetchPullRequest.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
    if (url) {
      const titleLink = summary.createEl("a", {
        text: title,
        href: url,
        cls: "linear-prs-group-title"
      });
      titleLink.setAttr("target", "_blank");
      titleLink.onclick = (e) => e.stopPropagation();
    } else {
      summary.createSpan({ text: title, cls: "linear-prs-group-title" });
    }
    const actions = summary.createSpan({ cls: "linear-prs-actions" });
    actions.createSpan({ text: String(pullRequests.length), cls: "linear-prs-count" });
    const refresh = createIconButton(
      actions,
      `Refresh ${title}`,
      "refresh-cw",
      () => void this.refreshGroup(id, title),
      { loading: this.refreshingGroups.has(id) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size && !this.refreshingGroups.has(id)) {
      refresh.disabled = true;
    }
    createIconButton(
      actions,
      "Copy group PRs",
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(pullRequests))
    );
    createIconButton(
      actions,
      "Launch group PRs",
      "rocket",
      () => void this.launchMany(pullRequests),
      { loading: this.isLaunching(pullRequests) ? "pulse" : void 0 }
    );
    const reviewers = this.plugin.settings.favoriteReviewers.split(",").map((s) => s.trim()).filter(Boolean);
    if (reviewers.length) {
      const select = actions.createEl("select", {
        cls: "linear-prs-reviewer-select",
        attr: { "aria-label": "Assign reviewer to group PRs" }
      });
      select.createEl("option", { text: "Reviewer", value: "" });
      for (const login of reviewers) {
        select.createEl("option", { text: login, value: login });
      }
      select.onclick = (e) => e.stopPropagation();
      select.onchange = () => {
        const login = select.value;
        if (!login) {
          return;
        }
        void this.runAction(async () => {
          for (const pullRequest of pullRequests) {
            await requestReviewer(this.plugin.credentials(), pullRequest, login);
          }
        }, `Requested ${login} for ${pullRequests.length} PRs`);
        select.value = "";
      };
    }
    const list = fetchPullRequest.createDiv({ cls: "linear-prs-list" });
    pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
  }
  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("linear-prs");
    const metadata = this.plugin.metadata;
    const shell = root.createDiv({ cls: "linear-prs-shell" });
    this.renderToolbar(shell);
    if (!this.plugin.settings.linearKey || !this.plugin.settings.githubKey) {
      shell.createDiv({
        text: "Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.",
        cls: "linear-prs-empty"
      });
    }
    this.renderReviewMessage(shell);
    const all = this.getVisiblePullRequests();
    if (!this.archived) {
      for (const stage of STAGES) {
        this.renderStagingSection(
          all.filter((pullRequest) => metadata.reviewTypes[pullRequest.id] === stage),
          stageTitle(metadata, stage),
          stage,
          shell
        );
      }
    }
    shell.createEl("h2", {
      text: this.archived ? "Archived pull requests" : "Pull requests",
      cls: "linear-prs-section-title"
    });
    const unstagedPullRequests = this.archived ? all : all.filter(
      (pullRequest) => (metadata.reviewTypes[pullRequest.id] ?? "none") === "none"
    );
    this.renderIssueGroups(unstagedPullRequests, shell);
    this.renderUnlinkedPullRequests(unstagedPullRequests, shell);
  }
  renderToolbar(shell) {
    const metadata = this.plugin.metadata;
    const header = shell.createDiv({ cls: "linear-prs-header" });
    const right = header.createSpan({ cls: "linear-prs-toolbar" });
    const activity = right.createDiv({ cls: "linear-prs-merge-activity" });
    activity.setAttr("role", "img");
    const days = metadata.mergeActivity;
    const total = days?.reduce((sum, day) => sum + day.count, 0) ?? 0;
    activity.setAttr(
      "aria-label",
      days ? `${total} PRs merged over the last 14 days` : "Merge activity loads on refresh"
    );
    activity.createSpan({
      cls: "linear-prs-merge-caption",
      text: days ? `${total} merged \xB7 14d` : "Merges \xB7 14d"
    });
    const bars = activity.createDiv({ cls: "linear-prs-merge-bars" });
    const max = Math.max(1, ...days?.map((day) => day.count) ?? []);
    for (const day of days ?? Array.from({ length: 14 }, () => ({ date: "", count: 0 }))) {
      const bar = bars.createSpan({ cls: "linear-prs-merge-bar" });
      bar.style.height = `${Math.max(2, day.count / max * 24)}px`;
      bar.setAttr(
        "title",
        days ? `${day.date}: ${day.count} merged` : "Click refresh to load merge activity"
      );
      if (!day.count) {
        bar.addClass("is-empty");
      }
    }
    right.createSpan({
      cls: "linear-prs-activity-summary",
      text: activitySummary(metadata),
      attr: {
        title: metadata.lastRefresh ? `As of ${new Date(metadata.lastRefresh).toLocaleString()}. Refresh to update.` : "Refresh to load counts."
      }
    });
    const shortcutLabel = import_obsidian5.Platform.isMacOS ? "\u2318F" : "Ctrl+F";
    const search = right.createEl("input", {
      cls: "linear-prs-search",
      attr: {
        type: "search",
        placeholder: "Search pull requests\u2026",
        "aria-label": "Search pull requests",
        title: `Search pull requests (${shortcutLabel})`
      }
    });
    const historyId = `linear-prs-search-history-${this.searchHistoryId}`;
    search.setAttr("list", historyId);
    const history = right.createEl("datalist", { attr: { id: historyId } });
    for (const query of metadata.searchHistory) {
      history.createEl("option", { value: query });
    }
    search.value = this.search;
    this.searchInput = search;
    search.oninput = () => {
      this.search = search.value;
      const start = search.selectionStart;
      this.render();
      this.searchInput?.focus();
      this.searchInput?.setSelectionRange(start, start);
    };
    search.onkeydown = (event) => {
      if (event.key === "Enter") {
        metadata.searchHistory = rememberSearch(metadata.searchHistory, search.value);
        void this.plugin.saveMetadata();
        history.empty();
        for (const query of metadata.searchHistory) {
          history.createEl("option", { value: query });
        }
      }
      if (event.key === "Escape" && search.value) {
        event.stopPropagation();
        this.search = "";
        this.render();
        this.searchInput?.focus();
      }
    };
    createIconButton(
      right,
      "Archived pull requests",
      "archive",
      () => {
        this.archived = !this.archived;
        this.render();
      },
      { active: this.archived }
    );
    const refresh = createIconButton(
      right,
      "Refresh from Linear and GitHub",
      "refresh-cw",
      () => void this.refresh(),
      { loading: this.busy ? "spin" : void 0 }
    );
    if (this.refreshingGroups.size) {
      refresh.disabled = true;
    }
  }
  renderIssueGroups(unstagedPullRequests, shell) {
    const groups = /* @__PURE__ */ new Map();
    for (const pullRequest of unstagedPullRequests.filter(
      (pullRequest2) => pullRequest2.groupId !== "unlinked"
    )) {
      const groupPullRequests = groups.get(pullRequest.groupId) ?? [];
      groupPullRequests.push(pullRequest);
      groups.set(pullRequest.groupId, groupPullRequests);
    }
    for (const pullRequests of groups.values()) {
      const pullRequest = pullRequests[0];
      this.renderGroup(
        pullRequests,
        pullRequest.groupId,
        pullRequest.groupTitle.replace(/^[A-Z]+-\d+\s+/, ""),
        pullRequest.groupUrl,
        shell
      );
    }
    if (!groups.size) {
      shell.createDiv({
        text: "No pull requests associated with Linear tasks",
        cls: "linear-prs-empty"
      });
    }
  }
  renderUnlinkedPullRequests(unstagedPullRequests, shell) {
    const unlinked = unstagedPullRequests.filter(
      (pullRequest) => pullRequest.groupId === "unlinked"
    );
    const unlinkedDetails = shell.createEl("details", {
      cls: "linear-prs-group linear-prs-unlinked-group"
    });
    this.rememberCollapse(unlinkedDetails, "section:unlinked");
    const unlinkedSummary = unlinkedDetails.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(unlinkedSummary, "chevron-down", void 0, "linear-prs-chevron");
    unlinkedSummary.createSpan({
      text: "Pull requests without Linear tasks",
      cls: "linear-prs-group-title"
    });
    unlinkedSummary.createSpan({
      text: String(unlinked.length),
      cls: "linear-prs-count"
    });
    const list = unlinkedDetails.createDiv({ cls: "linear-prs-unlinked-list" });
    if (unlinked.length) {
      unlinked.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    } else {
      list.createDiv({
        text: "No pull requests without Linear tasks",
        cls: "linear-prs-empty"
      });
    }
  }
};

// src/ui/diff-view.ts
var import_obsidian7 = require("obsidian");

// src/api/diff.ts
async function fetchPullRequestDiff(token, pullRequest) {
  if (!token) {
    throw new Error("Enter a GitHub API key in Linear PRs settings.");
  }
  const path = `/repos/${pullRequest.repo}/pulls/${pullRequest.number}`;
  const [details, diff] = await Promise.all([
    requestGitHub(token, path),
    requestGitHubDiff(token, path)
  ]);
  return { description: details.body ?? "", diff };
}

// src/ui/review-diff.ts
var import_diff2html = __toESM(require_diff2html());
var import_diff2html_ui_base = __toESM(require_diff2html_ui_base());

// src/file-tree.ts
function buildFileTree(files) {
  const root = { name: "", path: "", children: [] };
  for (const file of files) {
    let parent = root;
    const parts = file.filename.split("/");
    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let child = parent.children.find((node) => node.path === path);
      if (!child) {
        child = { name, path, children: [] };
        parent.children.push(child);
      }
      if (index === parts.length - 1) {
        child.file = file;
      }
      parent = child;
    });
  }
  const sort = (nodes) => {
    nodes.sort(
      (left, right) => Number(!!left.file) - Number(!!right.file) || left.name.localeCompare(right.name)
    );
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

// src/ui/file-tree.ts
function renderFileTree(parent, files) {
  const folders = [];
  const buttons = [];
  const render = (nodes, container) => {
    for (let node of nodes) {
      if (node.file) {
        const entry = node.file;
        const button = container.createEl("button", {
          cls: "linear-prs-diff-file-link",
          attr: { title: entry.filename, type: "button" }
        });
        createIcon(button, "file-code");
        button.createSpan({ text: node.name });
        button.onclick = () => {
          buttons.forEach(({ element }) => {
            element.removeClass("is-current");
            element.removeAttribute("aria-current");
          });
          button.addClass("is-current");
          button.setAttr("aria-current", "true");
          entry.select();
        };
        buttons.push({ entry, element: button });
        continue;
      }
      let name = node.name;
      while (node.children.length === 1 && !node.children[0].file) {
        node = node.children[0];
        name += `/${node.name}`;
      }
      const folder = container.createEl("details", {
        cls: "linear-prs-diff-folder",
        attr: { open: "" }
      });
      const summary = folder.createEl("summary", { attr: { title: node.path } });
      createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
      createIcon(summary, "folder");
      summary.createSpan({ text: name });
      folders.push({ path: node.path, element: folder });
      render(node.children, folder.createDiv({ cls: "linear-prs-diff-folder-children" }));
    }
  };
  render(buildFileTree(files), parent);
  const collapsed = /* @__PURE__ */ new Set();
  let filtering = false;
  return (query) => {
    const search = query.trim().toLowerCase();
    if (search && !filtering) {
      collapsed.clear();
      folders.filter((folder) => !folder.element.open).forEach((folder) => collapsed.add(folder.path));
    }
    buttons.forEach(({ entry, element }) => {
      element.hidden = !entry.filename.toLowerCase().includes(search);
    });
    for (const folder of folders) {
      folder.element.hidden = !buttons.some(
        ({ entry, element }) => !element.hidden && entry.filename.startsWith(`${folder.path}/`)
      );
      if (search) {
        folder.element.open = true;
      } else if (filtering) {
        folder.element.open = !collapsed.has(folder.path);
      }
    }
    filtering = !!search;
  };
}

// src/ui/review-diff.ts
var import_types = __toESM(require_types());

// node_modules/highlight.js/es/core.js
var import_core = __toESM(require_core(), 1);
var core_default = import_core.default;

// node_modules/highlight.js/es/languages/typescript.js
var IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "self",
  "global"
  // Node.js
];
var BUILT_INS = [].concat(
  BUILT_IN_GLOBALS,
  TYPES,
  ERROR_TYPES
);
function javascript(hljs) {
  const regex = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m = afterMatch.match(/^\s+extends\s+/)) {
        if (m.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE,
    keyword: KEYWORDS,
    literal: LITERALS,
    built_in: BUILT_INS,
    "variable.language": BUILT_IN_VARIABLES
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES,
        ...ERROR_TYPES
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list) {
    return regex.concat("(?!", list.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS,
        "super",
        "import",
        "await"
      ].map((x) => `${x}\\s*\\(`)),
      IDENT_RE$1,
      regex.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex.concat(/\./, regex.lookahead(
      regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}
function typescript(hljs) {
  const regex = hljs.regex;
  const tsLanguage = javascript(hljs);
  const IDENT_RE$1 = IDENT_RE;
  const TYPES3 = [
    "any",
    "void",
    "number",
    "boolean",
    "string",
    "object",
    "never",
    "symbol",
    "bigint",
    "unknown"
  ];
  const NAMESPACE = {
    begin: [
      /namespace/,
      /\s+/,
      hljs.IDENT_RE
    ],
    beginScope: {
      1: "keyword",
      3: "title.class"
    }
  };
  const INTERFACE = {
    beginKeywords: "interface",
    end: /\{/,
    excludeEnd: true,
    keywords: {
      keyword: "interface extends",
      built_in: TYPES3
    },
    contains: [tsLanguage.exports.CLASS_REFERENCE]
  };
  const USE_STRICT = {
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use strict['"]/
  };
  const TS_SPECIFIC_KEYWORDS = [
    "type",
    // "namespace",
    "interface",
    "public",
    "private",
    "protected",
    "implements",
    "declare",
    "abstract",
    "readonly",
    "enum",
    "override",
    "satisfies"
  ];
  const KEYWORDS$1 = {
    $pattern: IDENT_RE,
    keyword: KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
    literal: LITERALS,
    built_in: BUILT_INS.concat(TYPES3),
    "variable.language": BUILT_IN_VARIABLES
  };
  const DECORATOR = {
    className: "meta",
    begin: "@" + IDENT_RE$1
  };
  const swapMode = (mode, label, replacement) => {
    const indx = mode.contains.findIndex((m) => m.label === label);
    if (indx === -1) {
      throw new Error("can not find mode to replace");
    }
    mode.contains.splice(indx, 1, replacement);
  };
  Object.assign(tsLanguage.keywords, KEYWORDS$1);
  tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
  const ATTRIBUTE_HIGHLIGHT = tsLanguage.contains.find((c) => c.scope === "attr");
  const OPTIONAL_KEY_OR_ARGUMENT = Object.assign(
    {},
    ATTRIBUTE_HIGHLIGHT,
    { match: regex.concat(IDENT_RE$1, regex.lookahead(/\s*\?:/)) }
  );
  tsLanguage.exports.PARAMS_CONTAINS.push([
    tsLanguage.exports.CLASS_REFERENCE,
    // class reference for highlighting the params types
    ATTRIBUTE_HIGHLIGHT,
    // highlight the params key
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  tsLanguage.contains = tsLanguage.contains.concat([
    DECORATOR,
    NAMESPACE,
    INTERFACE,
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  swapMode(tsLanguage, "shebang", hljs.SHEBANG());
  swapMode(tsLanguage, "use_strict", USE_STRICT);
  const functionDeclaration = tsLanguage.contains.find((m) => m.label === "func.def");
  functionDeclaration.relevance = 0;
  Object.assign(tsLanguage, {
    name: "TypeScript",
    aliases: [
      "ts",
      "tsx",
      "mts",
      "cts"
    ]
  });
  return tsLanguage;
}

// node_modules/highlight.js/es/languages/javascript.js
var IDENT_RE2 = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS2 = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS2 = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES2 = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES2 = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS2 = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES2 = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "self",
  "global"
  // Node.js
];
var BUILT_INS2 = [].concat(
  BUILT_IN_GLOBALS2,
  TYPES2,
  ERROR_TYPES2
);
function javascript2(hljs) {
  const regex = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE2;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m = afterMatch.match(/^\s+extends\s+/)) {
        if (m.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE2,
    keyword: KEYWORDS2,
    literal: LITERALS2,
    built_in: BUILT_INS2,
    "variable.language": BUILT_IN_VARIABLES2
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES2,
        ...ERROR_TYPES2
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list) {
    return regex.concat("(?!", list.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS2,
        "super",
        "import",
        "await"
      ].map((x) => `${x}\\s*\\(`)),
      IDENT_RE$1,
      regex.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex.concat(/\./, regex.lookahead(
      regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/json.js
var EXTENDED_NUMBER_RE = "([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity";
var EXTENDED_NUMBER_MODE = {
  scope: "number",
  match: EXTENDED_NUMBER_RE,
  relevance: 0
};
function json(hljs) {
  const ATTRIBUTE = {
    className: "attr",
    begin: /(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,
    relevance: 1.01
  };
  const PUNCTUATION = {
    match: /[{}[\],:]/,
    className: "punctuation",
    relevance: 0
  };
  const LITERALS3 = [
    "true",
    "false",
    "null"
  ];
  const LITERALS_MODE = {
    scope: "literal",
    beginKeywords: LITERALS3.join(" ")
  };
  return {
    name: "JSON",
    aliases: ["jsonc", "json5"],
    keywords: {
      literal: LITERALS3
    },
    contains: [
      ATTRIBUTE,
      PUNCTUATION,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      LITERALS_MODE,
      EXTENDED_NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ],
    illegal: "\\S"
  };
}

// node_modules/highlight.js/es/languages/css.js
var MODES = (hljs) => {
  return {
    IMPORTANT: {
      scope: "meta",
      begin: "!important"
    },
    BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
    HEXCOLOR: {
      scope: "number",
      begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
    },
    UNICODE_RANGE: {
      scope: "number",
      begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
    },
    FUNCTION_DISPATCH: {
      className: "built_in",
      begin: /[\w-]+(?=\()/
    },
    ATTRIBUTE_SELECTOR_MODE: {
      scope: "selector-attr",
      begin: /\[/,
      end: /\]/,
      illegal: "$",
      contains: [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    },
    CSS_NUMBER_MODE: {
      scope: "number",
      begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
      relevance: 0
    },
    CSS_VARIABLE: {
      className: "attr",
      begin: /--[A-Za-z_][A-Za-z0-9_-]*/
    }
  };
};
var HTML_TAGS = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "nav",
  "object",
  "ol",
  "optgroup",
  "option",
  "p",
  "picture",
  "q",
  "quote",
  "samp",
  "section",
  "select",
  "source",
  "span",
  "strong",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "ul",
  "var",
  "video"
];
var SVG_TAGS = [
  "defs",
  "g",
  "marker",
  "mask",
  "pattern",
  "svg",
  "switch",
  "symbol",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence",
  "linearGradient",
  "radialGradient",
  "stop",
  "circle",
  "ellipse",
  "image",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "use",
  "textPath",
  "tspan",
  "foreignObject",
  "clipPath"
];
var TAGS = [
  ...HTML_TAGS,
  ...SVG_TAGS
];
var MEDIA_FEATURES = [
  "any-hover",
  "any-pointer",
  "aspect-ratio",
  "color",
  "color-gamut",
  "color-index",
  "device-aspect-ratio",
  "device-height",
  "device-width",
  "display-mode",
  "forced-colors",
  "grid",
  "height",
  "hover",
  "inverted-colors",
  "monochrome",
  "orientation",
  "overflow-block",
  "overflow-inline",
  "pointer",
  "prefers-color-scheme",
  "prefers-contrast",
  "prefers-reduced-motion",
  "prefers-reduced-transparency",
  "resolution",
  "scan",
  "scripting",
  "update",
  "width",
  // TODO: find a better solution?
  "min-width",
  "max-width",
  "min-height",
  "max-height"
].sort().reverse();
var PSEUDO_CLASSES = [
  "active",
  "any-link",
  "blank",
  "checked",
  "current",
  "default",
  "defined",
  "dir",
  // dir()
  "disabled",
  "drop",
  "empty",
  "enabled",
  "first",
  "first-child",
  "first-of-type",
  "fullscreen",
  "future",
  "focus",
  "focus-visible",
  "focus-within",
  "has",
  // has()
  "host",
  // host or host()
  "host-context",
  // host-context()
  "hover",
  "indeterminate",
  "in-range",
  "invalid",
  "is",
  // is()
  "lang",
  // lang()
  "last-child",
  "last-of-type",
  "left",
  "link",
  "local-link",
  "not",
  // not()
  "nth-child",
  // nth-child()
  "nth-col",
  // nth-col()
  "nth-last-child",
  // nth-last-child()
  "nth-last-col",
  // nth-last-col()
  "nth-last-of-type",
  //nth-last-of-type()
  "nth-of-type",
  //nth-of-type()
  "only-child",
  "only-of-type",
  "optional",
  "out-of-range",
  "past",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "right",
  "root",
  "scope",
  "target",
  "target-within",
  "user-invalid",
  "valid",
  "visited",
  "where"
  // where()
].sort().reverse();
var PSEUDO_ELEMENTS = [
  "after",
  "backdrop",
  "before",
  "cue",
  "cue-region",
  "first-letter",
  "first-line",
  "grammar-error",
  "marker",
  "part",
  "placeholder",
  "selection",
  "slotted",
  "spelling-error"
].sort().reverse();
var ATTRIBUTES = [
  "accent-color",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "all",
  "anchor-name",
  "animation",
  "animation-composition",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-range",
  "animation-range-end",
  "animation-range-start",
  "animation-timeline",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backdrop-filter",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "block-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-style",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-style",
  "border-block-start-width",
  "border-block-style",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-style",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-style",
  "border-inline-start-width",
  "border-inline-style",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "caret-color",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "color-scheme",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "contain",
  "contain-intrinsic-block-size",
  "contain-intrinsic-height",
  "contain-intrinsic-inline-size",
  "contain-intrinsic-size",
  "contain-intrinsic-width",
  "container",
  "container-name",
  "container-type",
  "content",
  "content-visibility",
  "corner-bottom-left-shape",
  "corner-bottom-right-shape",
  "corner-shape",
  "corner-top-left-shape",
  "corner-top-right-shape",
  "counter-increment",
  "counter-reset",
  "counter-set",
  "cue",
  "cue-after",
  "cue-before",
  "cursor",
  "cx",
  "cy",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "field-sizing",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "flow",
  "font",
  "font-display",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-smooth",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-synthesis-position",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-weight",
  "forced-color-adjust",
  "gap",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid",
  "grid-area",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column",
  "grid-column-end",
  "grid-column-start",
  "grid-gap",
  "grid-row",
  "grid-row-end",
  "grid-row-start",
  "grid-template",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
  "hanging-punctuation",
  "height",
  "hyphenate-character",
  "hyphenate-limit-chars",
  "hyphens",
  "icon",
  "image-orientation",
  "image-rendering",
  "image-resolution",
  "ime-mode",
  "initial-letter",
  "initial-letter-align",
  "inline-size",
  "inset",
  "inset-area",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "isolation",
  "justify-content",
  "justify-items",
  "justify-self",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "line-height-step",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-trim",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marks",
  "mask",
  "mask-border",
  "mask-border-mode",
  "mask-border-outset",
  "mask-border-repeat",
  "mask-border-slice",
  "mask-border-source",
  "mask-border-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-mode",
  "mask-origin",
  "mask-position",
  "mask-repeat",
  "mask-size",
  "mask-type",
  "masonry-auto-flow",
  "math-depth",
  "math-shift",
  "math-style",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-width",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "mix-blend-mode",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "none",
  "normal",
  "object-fit",
  "object-position",
  "offset",
  "offset-anchor",
  "offset-distance",
  "offset-path",
  "offset-position",
  "offset-rotate",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-anchor",
  "overflow-block",
  "overflow-clip-margin",
  "overflow-inline",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "overlay",
  "overscroll-behavior",
  "overscroll-behavior-block",
  "overscroll-behavior-inline",
  "overscroll-behavior-x",
  "overscroll-behavior-y",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "pause",
  "pause-after",
  "pause-before",
  "perspective",
  "perspective-origin",
  "place-content",
  "place-items",
  "place-self",
  "pointer-events",
  "position",
  "position-anchor",
  "position-visibility",
  "print-color-adjust",
  "quotes",
  "r",
  "resize",
  "rest",
  "rest-after",
  "rest-before",
  "right",
  "rotate",
  "row-gap",
  "ruby-align",
  "ruby-position",
  "scale",
  "scroll-behavior",
  "scroll-margin",
  "scroll-margin-block",
  "scroll-margin-block-end",
  "scroll-margin-block-start",
  "scroll-margin-bottom",
  "scroll-margin-inline",
  "scroll-margin-inline-end",
  "scroll-margin-inline-start",
  "scroll-margin-left",
  "scroll-margin-right",
  "scroll-margin-top",
  "scroll-padding",
  "scroll-padding-block",
  "scroll-padding-block-end",
  "scroll-padding-block-start",
  "scroll-padding-bottom",
  "scroll-padding-inline",
  "scroll-padding-inline-end",
  "scroll-padding-inline-start",
  "scroll-padding-left",
  "scroll-padding-right",
  "scroll-padding-top",
  "scroll-snap-align",
  "scroll-snap-stop",
  "scroll-snap-type",
  "scroll-timeline",
  "scroll-timeline-axis",
  "scroll-timeline-name",
  "scrollbar-color",
  "scrollbar-gutter",
  "scrollbar-width",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "speak",
  "speak-as",
  "src",
  // @font-face
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "text-align",
  "text-align-all",
  "text-align-last",
  "text-anchor",
  "text-combine-upright",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip",
  "text-decoration-skip-ink",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-indent",
  "text-justify",
  "text-orientation",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "text-underline-offset",
  "text-underline-position",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "timeline-scope",
  "top",
  "touch-action",
  "transform",
  "transform-box",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-behavior",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "unicode-bidi",
  "unicode-range",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "view-timeline",
  "view-timeline-axis",
  "view-timeline-inset",
  "view-timeline-name",
  "view-transition-name",
  "visibility",
  "voice-balance",
  "voice-duration",
  "voice-family",
  "voice-pitch",
  "voice-range",
  "voice-rate",
  "voice-stress",
  "voice-volume",
  "white-space",
  "white-space-collapse",
  "widows",
  "width",
  "will-change",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "x",
  "y",
  "z-index",
  "zoom"
].sort().reverse();
function css(hljs) {
  const regex = hljs.regex;
  const modes = MODES(hljs);
  const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
  const AT_MODIFIERS = "and or not only";
  const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/;
  const IDENT_RE3 = "[a-zA-Z-][a-zA-Z0-9_-]*";
  const STRINGS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE
  ];
  return {
    name: "CSS",
    case_insensitive: true,
    illegal: /[=|'\$]/,
    keywords: { keyframePosition: "from to" },
    classNameAliases: {
      // for visual continuity with `tag {}` and because we
      // don't have a great class for this?
      keyframePosition: "selector-tag"
    },
    contains: [
      modes.BLOCK_COMMENT,
      VENDOR_PREFIX,
      // to recognize keyframe 40% etc which are outside the scope of our
      // attribute value mode
      modes.CSS_NUMBER_MODE,
      {
        className: "selector-id",
        begin: /#[A-Za-z0-9_-]+/,
        relevance: 0
      },
      {
        className: "selector-class",
        begin: "\\." + IDENT_RE3,
        relevance: 0
      },
      modes.ATTRIBUTE_SELECTOR_MODE,
      {
        className: "selector-pseudo",
        variants: [
          { begin: ":(" + PSEUDO_CLASSES.join("|") + ")" },
          { begin: ":(:)?(" + PSEUDO_ELEMENTS.join("|") + ")" }
        ]
      },
      // we may actually need this (12/2020)
      // { // pseudo-selector params
      //   begin: /\(/,
      //   end: /\)/,
      //   contains: [ hljs.CSS_NUMBER_MODE ]
      // },
      modes.CSS_VARIABLE,
      {
        className: "attribute",
        begin: "\\b(" + ATTRIBUTES.join("|") + ")\\b"
      },
      // attribute values
      {
        begin: /:/,
        end: /[;}{]/,
        contains: [
          modes.BLOCK_COMMENT,
          modes.HEXCOLOR,
          modes.IMPORTANT,
          modes.CSS_NUMBER_MODE,
          modes.UNICODE_RANGE,
          ...STRINGS,
          // needed to highlight these as strings and to avoid issues with
          // illegal characters that might be inside urls that would trigger the
          // languages illegal stack
          {
            begin: /(url|data-uri)\(/,
            end: /\)/,
            relevance: 0,
            // from keywords
            keywords: { built_in: "url data-uri" },
            contains: [
              ...STRINGS,
              {
                className: "string",
                // any character other than `)` as in `url()` will be the start
                // of a string, which ends with `)` (from the parent mode)
                begin: /[^)]/,
                endsWithParent: true,
                excludeEnd: true
              }
            ]
          },
          modes.FUNCTION_DISPATCH
        ]
      },
      {
        begin: regex.lookahead(/@/),
        end: "[{;]",
        relevance: 0,
        illegal: /:/,
        // break on Less variables @var: ...
        contains: [
          {
            className: "keyword",
            begin: AT_PROPERTY_RE
          },
          {
            begin: /\s/,
            endsWithParent: true,
            excludeEnd: true,
            relevance: 0,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(" ")
            },
            contains: [
              {
                begin: /[a-z-]+(?=:)/,
                className: "attribute"
              },
              ...STRINGS,
              modes.CSS_NUMBER_MODE
            ]
          }
        ]
      },
      {
        className: "selector-tag",
        begin: "\\b(" + TAGS.join("|") + ")\\b"
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/xml.js
function xml(hljs) {
  const regex = hljs.regex;
  const TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
  const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
  const XML_ENTITIES = {
    className: "symbol",
    begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
  };
  const XML_META_KEYWORDS = {
    begin: /\s/,
    contains: [
      {
        className: "keyword",
        begin: /#?[a-z_][a-z1-9_-]+/,
        illegal: /\n/
      }
    ]
  };
  const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
    begin: /\(/,
    end: /\)/
  });
  const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, { className: "string" });
  const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, { className: "string" });
  const TAG_INTERNALS = {
    endsWithParent: true,
    illegal: /</,
    relevance: 0,
    contains: [
      {
        className: "attr",
        begin: XML_IDENT_RE,
        relevance: 0
      },
      {
        begin: /=\s*/,
        relevance: 0,
        contains: [
          {
            className: "string",
            endsParent: true,
            variants: [
              {
                begin: /"/,
                end: /"/,
                contains: [XML_ENTITIES]
              },
              {
                begin: /'/,
                end: /'/,
                contains: [XML_ENTITIES]
              },
              { begin: /[^\s"'=<>`]+/ }
            ]
          }
        ]
      }
    ]
  };
  return {
    name: "HTML, XML",
    aliases: [
      "html",
      "xhtml",
      "rss",
      "atom",
      "xjb",
      "xsd",
      "xsl",
      "plist",
      "wsf",
      "svg"
    ],
    case_insensitive: true,
    unicodeRegex: true,
    contains: [
      {
        className: "meta",
        begin: /<![a-z]/,
        end: />/,
        relevance: 10,
        contains: [
          XML_META_KEYWORDS,
          QUOTE_META_STRING_MODE,
          APOS_META_STRING_MODE,
          XML_META_PAR_KEYWORDS,
          {
            begin: /\[/,
            end: /\]/,
            contains: [
              {
                className: "meta",
                begin: /<![a-z]/,
                end: />/,
                contains: [
                  XML_META_KEYWORDS,
                  XML_META_PAR_KEYWORDS,
                  QUOTE_META_STRING_MODE,
                  APOS_META_STRING_MODE
                ]
              }
            ]
          }
        ]
      },
      hljs.COMMENT(
        /<!--/,
        /-->/,
        { relevance: 10 }
      ),
      {
        begin: /<!\[CDATA\[/,
        end: /\]\]>/,
        relevance: 10
      },
      XML_ENTITIES,
      // xml processing instructions
      {
        className: "meta",
        end: /\?>/,
        variants: [
          {
            begin: /<\?xml/,
            relevance: 10,
            contains: [
              QUOTE_META_STRING_MODE
            ]
          },
          {
            begin: /<\?[a-z][a-z0-9]+/
          }
        ]
      },
      {
        className: "tag",
        /*
        The lookahead pattern (?=...) ensures that 'begin' only matches
        '<style' as a single word, followed by a whitespace or an
        ending bracket.
        */
        begin: /<style(?=\s|>)/,
        end: />/,
        keywords: { name: "style" },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/style>/,
          returnEnd: true,
          subLanguage: "css"
        }
      },
      {
        className: "tag",
        // See the comment in the <style tag about the lookahead pattern
        begin: /<script(?=\s|>)/,
        end: />/,
        keywords: { name: "script" },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/script>/,
          returnEnd: true,
          subLanguage: "javascript"
        }
      },
      // we need this for now for jSX
      {
        className: "tag",
        begin: /<>|<\/>/
      },
      // open tag
      {
        className: "tag",
        begin: regex.concat(
          /</,
          regex.lookahead(regex.concat(
            TAG_NAME_RE,
            // <tag/>
            // <tag>
            // <tag ...
            regex.either(/\/>/, />/, /\s/)
          ))
        ),
        end: /\/?>/,
        contains: [
          {
            className: "name",
            begin: TAG_NAME_RE,
            relevance: 0,
            starts: TAG_INTERNALS
          }
        ]
      },
      // close tag
      {
        className: "tag",
        begin: regex.concat(
          /<\//,
          regex.lookahead(regex.concat(
            TAG_NAME_RE,
            />/
          ))
        ),
        contains: [
          {
            className: "name",
            begin: TAG_NAME_RE,
            relevance: 0
          },
          {
            begin: />/,
            relevance: 0,
            endsParent: true
          }
        ]
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/python.js
function python(hljs) {
  const regex = hljs.regex;
  const IDENT_RE3 = /[\p{XID_Start}_]\p{XID_Continue}*/u;
  const RESERVED_WORDS = [
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "case",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "lazy",
    "match",
    "nonlocal|10",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield"
  ];
  const BUILT_INS3 = [
    "__import__",
    "abs",
    "aiter",
    "all",
    "anext",
    "any",
    "ascii",
    "bin",
    "bool",
    "breakpoint",
    "bytearray",
    "bytes",
    "callable",
    "chr",
    "classmethod",
    "compile",
    "complex",
    "delattr",
    "dict",
    "dir",
    "divmod",
    "enumerate",
    "eval",
    "exec",
    "filter",
    "float",
    "format",
    "frozendict",
    "frozenset",
    "getattr",
    "globals",
    "hasattr",
    "hash",
    "help",
    "hex",
    "id",
    "input",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "len",
    "list",
    "locals",
    "map",
    "max",
    "memoryview",
    "min",
    "next",
    "object",
    "oct",
    "open",
    "ord",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "sentinel",
    "set",
    "setattr",
    "slice",
    "sorted",
    "staticmethod",
    "str",
    "sum",
    "super",
    "tuple",
    "type",
    "vars",
    "zip"
  ];
  const LITERALS3 = [
    "__debug__",
    "Ellipsis",
    "False",
    "None",
    "NotImplemented",
    "True"
  ];
  const TYPES3 = [
    "Any",
    "Callable",
    "Coroutine",
    "Dict",
    "List",
    "Literal",
    "Generic",
    "Optional",
    "Sequence",
    "Set",
    "Tuple",
    "Type",
    "Union"
  ];
  const KEYWORDS3 = {
    $pattern: /[A-Za-z]\w+|__\w+__/,
    keyword: RESERVED_WORDS,
    built_in: BUILT_INS3,
    literal: LITERALS3,
    type: TYPES3
  };
  const PROMPT = {
    className: "meta",
    begin: /^(>>>|\.\.\.) /
  };
  const SUBST = {
    className: "subst",
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS3,
    illegal: /#/
  };
  const LITERAL_BRACKET = {
    begin: /\{\{/,
    relevance: 0
  };
  const STRING = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([uU]|[rR])'/,
        end: /'/,
        relevance: 10
      },
      {
        begin: /([uU]|[rR])"/,
        end: /"/,
        relevance: 10
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])'/,
        end: /'/
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])"/,
        end: /"/
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'/,
        end: /'/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"/,
        end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
  const digitpart = "[0-9](_?[0-9])*";
  const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
  const lookahead = `\\b|${RESERVED_WORDS.join("|")}`;
  const NUMBER = {
    className: "number",
    relevance: 0,
    variants: [
      // exponentfloat, pointfloat
      // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
      // optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      // Note: no leading \b because floats can start with a decimal point
      // and we don't want to mishandle e.g. `fn(.5)`,
      // no trailing \b for pointfloat because it can end with a decimal point
      // and we don't want to mishandle e.g. `0..hex()`; this should be safe
      // because both MUST contain a decimal point and so cannot be confused with
      // the interior part of an identifier
      {
        begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
      },
      {
        begin: `(${pointfloat})[jJ]?`
      },
      // decinteger, bininteger, octinteger, hexinteger
      // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
      // optionally "long" in Python 2
      // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
      // decinteger is optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
      },
      {
        begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
      },
      // imagnumber (digitpart-based)
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b(${digitpart})[jJ](?=${lookahead})`
      }
    ]
  };
  const COMMENT_TYPE = {
    className: "comment",
    begin: regex.lookahead(/# type:/),
    end: /$/,
    keywords: KEYWORDS3,
    contains: [
      {
        // prevent keywords from coloring `type`
        begin: /# type:/
      },
      // comment within a datatype comment includes no keywords
      {
        begin: /#/,
        end: /\b\B/,
        endsWithParent: true
      }
    ]
  };
  const PARAMS = {
    className: "params",
    variants: [
      // Exclude params in functions without params
      {
        className: "",
        begin: /\(\s*\)/,
        skip: true
      },
      {
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS3,
        contains: [
          "self",
          PROMPT,
          NUMBER,
          STRING,
          hljs.HASH_COMMENT_MODE
        ]
      }
    ]
  };
  SUBST.contains = [
    STRING,
    NUMBER,
    PROMPT
  ];
  return {
    name: "Python",
    aliases: [
      "py",
      "gyp",
      "ipython"
    ],
    unicodeRegex: true,
    keywords: KEYWORDS3,
    illegal: /(<\/|\?)|=>/,
    contains: [
      PROMPT,
      NUMBER,
      {
        // very common convention
        scope: "variable.language",
        match: /\bself\b/
      },
      {
        // eat "if" prior to string so that it won't accidentally be
        // labeled as an f-string
        beginKeywords: "if",
        relevance: 0
      },
      { match: /\bor\b/, scope: "keyword" },
      STRING,
      COMMENT_TYPE,
      hljs.HASH_COMMENT_MODE,
      {
        match: [
          /\bdef/,
          /\s+/,
          IDENT_RE3
        ],
        scope: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      },
      {
        variants: [
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3,
              /\s*/,
              /\(\s*/,
              IDENT_RE3,
              /\s*\)/
            ]
          },
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3
            ]
          }
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          6: "title.class.inherited"
        }
      },
      {
        className: "meta",
        begin: /^[\t ]*@/,
        end: /(?=#)|$/,
        contains: [
          NUMBER,
          PARAMS,
          STRING
        ]
      }
    ]
  };
}

// node_modules/highlight.js/es/languages/bash.js
function bash(hljs) {
  const regex = hljs.regex;
  const VAR = {};
  const BRACED_VAR = {
    begin: /\$\{/,
    end: /\}/,
    contains: [
      "self",
      {
        begin: /:-/,
        contains: [VAR]
      }
      // default values
    ]
  };
  Object.assign(VAR, {
    className: "variable",
    variants: [
      { begin: regex.concat(
        /\$[\w\d#@][\w\d_]*/,
        // negative look-ahead tries to avoid matching patterns that are not
        // Perl at all like $ident$, @ident@, etc.
        `(?![\\w\\d])(?![$])`
      ) },
      BRACED_VAR
    ]
  });
  const SUBST = {
    className: "subst",
    begin: /\$\(/,
    end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  const COMMENT = hljs.inherit(
    hljs.COMMENT(),
    {
      match: [
        /(^|\s)/,
        /#.*$/
      ],
      scope: {
        2: "comment"
      }
    }
  );
  const HERE_DOC = {
    begin: /<<-?\s*(?=\w+)/,
    starts: { contains: [
      hljs.END_SAME_AS_BEGIN({
        begin: /(\w+)/,
        end: /(\w+)/,
        className: "string"
      })
    ] }
  };
  const QUOTE_STRING = {
    className: "string",
    begin: /"/,
    end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      SUBST
    ]
  };
  SUBST.contains.push(QUOTE_STRING);
  const ESCAPED_QUOTE = {
    match: /\\"/
  };
  const APOS_STRING = {
    className: "string",
    begin: /'/,
    end: /'/
  };
  const ESCAPED_APOS = {
    match: /\\'/
  };
  const ARITHMETIC = {
    begin: /\$?\(\(/,
    end: /\)\)/,
    contains: [
      {
        begin: /\d+#[0-9a-f]+/,
        className: "number"
      },
      hljs.NUMBER_MODE,
      VAR
    ]
  };
  const SH_LIKE_SHELLS = [
    "fish",
    "bash",
    "zsh",
    "sh",
    "csh",
    "ksh",
    "tcsh",
    "dash",
    "scsh"
  ];
  const KNOWN_SHEBANG = hljs.SHEBANG({
    binary: `(${SH_LIKE_SHELLS.join("|")})`,
    relevance: 10
  });
  const FUNCTION = {
    className: "function",
    begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
    returnBegin: true,
    contains: [hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
    relevance: 0
  };
  const KEYWORDS3 = [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "time",
    "for",
    "while",
    "until",
    "in",
    "do",
    "done",
    "case",
    "esac",
    "coproc",
    "function",
    "select"
  ];
  const LITERALS3 = [
    "true",
    "false"
  ];
  const PATH_MODE = { match: /(\/[a-z._-]+)+/ };
  const SHELL_BUILT_INS = [
    "break",
    "cd",
    "continue",
    "eval",
    "exec",
    "exit",
    "export",
    "getopts",
    "hash",
    "pwd",
    "readonly",
    "return",
    "shift",
    "test",
    "times",
    "trap",
    "umask",
    "unset"
  ];
  const BASH_BUILT_INS = [
    "alias",
    "bind",
    "builtin",
    "caller",
    "command",
    "declare",
    "echo",
    "enable",
    "help",
    "let",
    "local",
    "logout",
    "mapfile",
    "printf",
    "read",
    "readarray",
    "source",
    "sudo",
    "type",
    "typeset",
    "ulimit",
    "unalias"
  ];
  const ZSH_BUILT_INS = [
    "autoload",
    "bg",
    "bindkey",
    "bye",
    "cap",
    "chdir",
    "clone",
    "comparguments",
    "compcall",
    "compctl",
    "compdescribe",
    "compfiles",
    "compgroups",
    "compquote",
    "comptags",
    "comptry",
    "compvalues",
    "dirs",
    "disable",
    "disown",
    "echotc",
    "echoti",
    "emulate",
    "fc",
    "fg",
    "float",
    "functions",
    "getcap",
    "getln",
    "history",
    "integer",
    "jobs",
    "kill",
    "limit",
    "log",
    "noglob",
    "popd",
    "print",
    "pushd",
    "pushln",
    "rehash",
    "sched",
    "setcap",
    "setopt",
    "stat",
    "suspend",
    "ttyctl",
    "unfunction",
    "unhash",
    "unlimit",
    "unsetopt",
    "vared",
    "wait",
    "whence",
    "where",
    "which",
    "zcompile",
    "zformat",
    "zftp",
    "zle",
    "zmodload",
    "zparseopts",
    "zprof",
    "zpty",
    "zregexparse",
    "zsocket",
    "zstyle",
    "ztcp"
  ];
  const GNU_CORE_UTILS = [
    "chcon",
    "chgrp",
    "chown",
    "chmod",
    "cp",
    "dd",
    "df",
    "dir",
    "dircolors",
    "ln",
    "ls",
    "mkdir",
    "mkfifo",
    "mknod",
    "mktemp",
    "mv",
    "realpath",
    "rm",
    "rmdir",
    "shred",
    "sync",
    "touch",
    "truncate",
    "vdir",
    "b2sum",
    "base32",
    "base64",
    "cat",
    "cksum",
    "comm",
    "csplit",
    "cut",
    "expand",
    "fmt",
    "fold",
    "head",
    "join",
    "md5sum",
    "nl",
    "numfmt",
    "od",
    "paste",
    "ptx",
    "pr",
    "sha1sum",
    "sha224sum",
    "sha256sum",
    "sha384sum",
    "sha512sum",
    "shuf",
    "sort",
    "split",
    "sum",
    "tac",
    "tail",
    "tr",
    "tsort",
    "unexpand",
    "uniq",
    "wc",
    "arch",
    "basename",
    "chroot",
    "date",
    "dirname",
    "du",
    "echo",
    "env",
    "expr",
    "factor",
    // "false", // keyword literal already
    "groups",
    "hostid",
    "id",
    "link",
    "logname",
    "nice",
    "nohup",
    "nproc",
    "pathchk",
    "pinky",
    "printenv",
    "printf",
    "pwd",
    "readlink",
    "runcon",
    "seq",
    "sleep",
    "stat",
    "stdbuf",
    "stty",
    "tee",
    "test",
    "timeout",
    // "true", // keyword literal already
    "tty",
    "uname",
    "unlink",
    "uptime",
    "users",
    "who",
    "whoami",
    "yes"
  ];
  return {
    name: "Bash",
    aliases: [
      "sh",
      "zsh"
    ],
    keywords: {
      $pattern: /\b[a-z][a-z0-9._-]+\b/,
      keyword: KEYWORDS3,
      literal: LITERALS3,
      built_in: [
        ...SHELL_BUILT_INS,
        ...BASH_BUILT_INS,
        // Shell modifiers
        "set",
        "shopt",
        ...ZSH_BUILT_INS,
        ...GNU_CORE_UTILS
      ]
    },
    contains: [
      KNOWN_SHEBANG,
      // to catch known shells and boost relevancy
      hljs.SHEBANG(),
      // to catch unknown shells but still highlight the shebang
      FUNCTION,
      ARITHMETIC,
      COMMENT,
      HERE_DOC,
      PATH_MODE,
      QUOTE_STRING,
      ESCAPED_QUOTE,
      APOS_STRING,
      ESCAPED_APOS,
      VAR
    ]
  };
}

// node_modules/highlight.js/es/languages/yaml.js
function yaml(hljs) {
  const LITERALS3 = "true false yes no null";
  const URI_CHARACTERS = "[\\w#;/?:@&=+$,.~*'()[\\]]+";
  const KEY = {
    className: "attr",
    variants: [
      // added brackets support and special char support
      { begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
      {
        // double quoted keys - with brackets and special char support
        begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/
      },
      {
        // single quoted keys - with brackets and special char support
        begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/
      }
    ]
  };
  const TEMPLATE_VARIABLES = {
    className: "template-variable",
    variants: [
      {
        // jinja templates Ansible
        begin: /\{\{/,
        end: /\}\}/
      },
      {
        // Ruby i18n
        begin: /%\{/,
        end: /\}/
      }
    ]
  };
  const SINGLE_QUOTE_STRING = {
    className: "string",
    relevance: 0,
    begin: /'/,
    end: /'/,
    contains: [
      {
        match: /''/,
        scope: "char.escape",
        relevance: 0
      }
    ]
  };
  const STRING = {
    className: "string",
    relevance: 0,
    variants: [
      {
        begin: /"/,
        end: /"/
      },
      { begin: /\S+/ }
    ],
    contains: [
      hljs.BACKSLASH_ESCAPE,
      TEMPLATE_VARIABLES
    ]
  };
  const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
    {
      begin: /'/,
      end: /'/,
      contains: [
        {
          begin: /''/,
          relevance: 0
        }
      ]
    },
    {
      begin: /"/,
      end: /"/
    },
    { begin: /[^\s,{}[\]]+/ }
  ] });
  const DATE_RE = "[0-9]{4}(-[0-9][0-9]){0,2}";
  const TIME_RE = "([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?";
  const FRACTION_RE = "(\\.[0-9]*)?";
  const ZONE_RE = "([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?";
  const TIMESTAMP = {
    className: "number",
    begin: "\\b" + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + "\\b"
  };
  const VALUE_CONTAINER = {
    end: ",",
    endsWithParent: true,
    excludeEnd: true,
    keywords: LITERALS3,
    relevance: 0
  };
  const OBJECT = {
    begin: /\{/,
    end: /\}/,
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const ARRAY = {
    begin: "\\[",
    end: "\\]",
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const MODES2 = [
    KEY,
    {
      className: "meta",
      begin: "^---\\s*$",
      relevance: 10
    },
    {
      // multi line string
      // Blocks start with a | or > followed by a newline
      //
      // Indentation of subsequent lines must be the same to
      // be considered part of the block
      className: "string",
      begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
    },
    {
      // Ruby/Rails erb
      begin: "<%[%=-]?",
      end: "[%-]?%>",
      subLanguage: "ruby",
      excludeBegin: true,
      excludeEnd: true,
      relevance: 0
    },
    {
      // named tags
      className: "type",
      begin: "!\\w+!" + URI_CHARACTERS
    },
    // https://yaml.org/spec/1.2/spec.html#id2784064
    {
      // verbatim tags
      className: "type",
      begin: "!<" + URI_CHARACTERS + ">"
    },
    {
      // primary tags
      className: "type",
      begin: "!" + URI_CHARACTERS
    },
    {
      // secondary tags
      className: "type",
      begin: "!!" + URI_CHARACTERS
    },
    {
      // fragment id &ref
      className: "meta",
      begin: "&" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // fragment reference *ref
      className: "meta",
      begin: "\\*" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // array listing
      className: "bullet",
      // TODO: remove |$ hack when we have proper look-ahead support
      begin: "-(?=[ ]|$)",
      relevance: 0
    },
    hljs.HASH_COMMENT_MODE,
    {
      beginKeywords: LITERALS3,
      keywords: { literal: LITERALS3 }
    },
    TIMESTAMP,
    // numbers are any valid C-style number that
    // sit isolated from other words
    {
      className: "number",
      begin: hljs.C_NUMBER_RE + "\\b",
      relevance: 0
    },
    OBJECT,
    ARRAY,
    SINGLE_QUOTE_STRING,
    STRING
  ];
  const VALUE_MODES = [...MODES2];
  VALUE_MODES.pop();
  VALUE_MODES.push(CONTAINER_STRING);
  VALUE_CONTAINER.contains = VALUE_MODES;
  return {
    name: "YAML",
    case_insensitive: true,
    aliases: ["yml"],
    contains: MODES2
  };
}

// node_modules/highlight.js/es/languages/sql.js
function sql(hljs) {
  const regex = hljs.regex;
  const COMMENT_MODE = hljs.COMMENT("--", "$");
  const STRING = {
    scope: "string",
    variants: [
      {
        begin: /'/,
        end: /'/,
        contains: [{ match: /''/ }]
      }
    ]
  };
  const QUOTED_IDENTIFIER = {
    begin: /"/,
    end: /"/,
    contains: [{ match: /""/ }]
  };
  const LITERALS3 = [
    "true",
    "false",
    // Not sure it's correct to call NULL literal, and clauses like IS [NOT] NULL look strange that way.
    // "null",
    "unknown"
  ];
  const MULTI_WORD_TYPES = [
    "double precision",
    "large object",
    "with timezone",
    "without timezone"
  ];
  const TYPES3 = [
    "bigint",
    "binary",
    "blob",
    "boolean",
    "char",
    "character",
    "clob",
    "date",
    "dec",
    "decfloat",
    "decimal",
    "float",
    "int",
    "integer",
    "interval",
    "nchar",
    "nclob",
    "national",
    "numeric",
    "real",
    "row",
    "smallint",
    "time",
    "timestamp",
    "varchar",
    "varying",
    // modifier (character varying)
    "varbinary"
  ];
  const NON_RESERVED_WORDS = [
    "add",
    "asc",
    "collation",
    "desc",
    "final",
    "first",
    "last",
    "view"
  ];
  const RESERVED_WORDS = [
    "abs",
    "acos",
    "all",
    "allocate",
    "alter",
    "and",
    "any",
    "are",
    "array",
    "array_agg",
    "array_max_cardinality",
    "as",
    "asensitive",
    "asin",
    "asymmetric",
    "at",
    "atan",
    "atomic",
    "authorization",
    "avg",
    "begin",
    "begin_frame",
    "begin_partition",
    "between",
    "bigint",
    "binary",
    "blob",
    "boolean",
    "both",
    "by",
    "call",
    "called",
    "cardinality",
    "cascaded",
    "case",
    "cast",
    "ceil",
    "ceiling",
    "char",
    "char_length",
    "character",
    "character_length",
    "check",
    "classifier",
    "clob",
    "close",
    "coalesce",
    "collate",
    "collect",
    "column",
    "commit",
    "condition",
    "connect",
    "constraint",
    "contains",
    "convert",
    "copy",
    "corr",
    "corresponding",
    "cos",
    "cosh",
    "count",
    "covar_pop",
    "covar_samp",
    "create",
    "cross",
    "cube",
    "cume_dist",
    "current",
    "current_catalog",
    "current_date",
    "current_default_transform_group",
    "current_path",
    "current_role",
    "current_row",
    "current_schema",
    "current_time",
    "current_timestamp",
    "current_path",
    "current_role",
    "current_transform_group_for_type",
    "current_user",
    "cursor",
    "cycle",
    "date",
    "day",
    "deallocate",
    "dec",
    "decimal",
    "decfloat",
    "declare",
    "default",
    "define",
    "delete",
    "dense_rank",
    "deref",
    "describe",
    "deterministic",
    "disconnect",
    "distinct",
    "double",
    "drop",
    "dynamic",
    "each",
    "element",
    "else",
    "empty",
    "end",
    "end_frame",
    "end_partition",
    "end-exec",
    "equals",
    "escape",
    "every",
    "except",
    "exec",
    "execute",
    "exists",
    "exp",
    "external",
    "extract",
    "false",
    "fetch",
    "filter",
    "first_value",
    "float",
    "floor",
    "for",
    "foreign",
    "frame_row",
    "free",
    "from",
    "full",
    "function",
    "fusion",
    "get",
    "global",
    "grant",
    "group",
    "grouping",
    "groups",
    "having",
    "hold",
    "hour",
    "identity",
    "in",
    "indicator",
    "initial",
    "inner",
    "inout",
    "insensitive",
    "insert",
    "int",
    "integer",
    "intersect",
    "intersection",
    "interval",
    "into",
    "is",
    "join",
    "json_array",
    "json_arrayagg",
    "json_exists",
    "json_object",
    "json_objectagg",
    "json_query",
    "json_table",
    "json_table_primitive",
    "json_value",
    "lag",
    "language",
    "large",
    "last_value",
    "lateral",
    "lead",
    "leading",
    "left",
    "like",
    "like_regex",
    "listagg",
    "ln",
    "local",
    "localtime",
    "localtimestamp",
    "log",
    "log10",
    "lower",
    "match",
    "match_number",
    "match_recognize",
    "matches",
    "max",
    "member",
    "merge",
    "method",
    "min",
    "minute",
    "mod",
    "modifies",
    "module",
    "month",
    "multiset",
    "national",
    "natural",
    "nchar",
    "nclob",
    "new",
    "no",
    "none",
    "normalize",
    "not",
    "nth_value",
    "ntile",
    "null",
    "nullif",
    "numeric",
    "octet_length",
    "occurrences_regex",
    "of",
    "offset",
    "old",
    "omit",
    "on",
    "one",
    "only",
    "open",
    "or",
    "order",
    "out",
    "outer",
    "over",
    "overlaps",
    "overlay",
    "parameter",
    "partition",
    "pattern",
    "per",
    "percent",
    "percent_rank",
    "percentile_cont",
    "percentile_disc",
    "period",
    "portion",
    "position",
    "position_regex",
    "power",
    "precedes",
    "precision",
    "prepare",
    "primary",
    "procedure",
    "ptf",
    "range",
    "rank",
    "reads",
    "real",
    "recursive",
    "ref",
    "references",
    "referencing",
    "regr_avgx",
    "regr_avgy",
    "regr_count",
    "regr_intercept",
    "regr_r2",
    "regr_slope",
    "regr_sxx",
    "regr_sxy",
    "regr_syy",
    "release",
    "result",
    "return",
    "returns",
    "revoke",
    "right",
    "rollback",
    "rollup",
    "row",
    "row_number",
    "rows",
    "running",
    "savepoint",
    "scope",
    "scroll",
    "search",
    "second",
    "seek",
    "select",
    "sensitive",
    "session_user",
    "set",
    "show",
    "similar",
    "sin",
    "sinh",
    "skip",
    "smallint",
    "some",
    "specific",
    "specifictype",
    "sql",
    "sqlexception",
    "sqlstate",
    "sqlwarning",
    "sqrt",
    "start",
    "static",
    "stddev_pop",
    "stddev_samp",
    "submultiset",
    "subset",
    "substring",
    "substring_regex",
    "succeeds",
    "sum",
    "symmetric",
    "system",
    "system_time",
    "system_user",
    "table",
    "tablesample",
    "tan",
    "tanh",
    "then",
    "time",
    "timestamp",
    "timezone_hour",
    "timezone_minute",
    "to",
    "trailing",
    "translate",
    "translate_regex",
    "translation",
    "treat",
    "trigger",
    "trim",
    "trim_array",
    "true",
    "truncate",
    "uescape",
    "union",
    "unique",
    "unknown",
    "unnest",
    "update",
    "upper",
    "user",
    "using",
    "value",
    "values",
    "value_of",
    "var_pop",
    "var_samp",
    "varbinary",
    "varchar",
    "varying",
    "versioning",
    "when",
    "whenever",
    "where",
    "width_bucket",
    "window",
    "with",
    "within",
    "without",
    "year"
  ];
  const RESERVED_FUNCTIONS = [
    "abs",
    "acos",
    "array_agg",
    "asin",
    "atan",
    "avg",
    "cast",
    "ceil",
    "ceiling",
    "coalesce",
    "corr",
    "cos",
    "cosh",
    "count",
    "covar_pop",
    "covar_samp",
    "cume_dist",
    "dense_rank",
    "deref",
    "element",
    "exp",
    "extract",
    "first_value",
    "floor",
    "json_array",
    "json_arrayagg",
    "json_exists",
    "json_object",
    "json_objectagg",
    "json_query",
    "json_table",
    "json_table_primitive",
    "json_value",
    "lag",
    "last_value",
    "lead",
    "listagg",
    "ln",
    "log",
    "log10",
    "lower",
    "max",
    "min",
    "mod",
    "nth_value",
    "ntile",
    "nullif",
    "percent_rank",
    "percentile_cont",
    "percentile_disc",
    "position",
    "position_regex",
    "power",
    "rank",
    "regr_avgx",
    "regr_avgy",
    "regr_count",
    "regr_intercept",
    "regr_r2",
    "regr_slope",
    "regr_sxx",
    "regr_sxy",
    "regr_syy",
    "row_number",
    "sin",
    "sinh",
    "sqrt",
    "stddev_pop",
    "stddev_samp",
    "substring",
    "substring_regex",
    "sum",
    "tan",
    "tanh",
    "translate",
    "translate_regex",
    "treat",
    "trim",
    "trim_array",
    "unnest",
    "upper",
    "value_of",
    "var_pop",
    "var_samp",
    "width_bucket"
  ];
  const POSSIBLE_WITHOUT_PARENS = [
    "current_catalog",
    "current_date",
    "current_default_transform_group",
    "current_path",
    "current_role",
    "current_schema",
    "current_transform_group_for_type",
    "current_user",
    "session_user",
    "system_time",
    "system_user",
    "current_time",
    "localtime",
    "current_timestamp",
    "localtimestamp"
  ];
  const COMBOS = [
    "create table",
    "insert into",
    "primary key",
    "foreign key",
    "not null",
    "alter table",
    "add constraint",
    "grouping sets",
    "on overflow",
    "character set",
    "respect nulls",
    "ignore nulls",
    "nulls first",
    "nulls last",
    "depth first",
    "breadth first"
  ];
  const FUNCTIONS = RESERVED_FUNCTIONS;
  const KEYWORDS3 = [
    ...RESERVED_WORDS,
    ...NON_RESERVED_WORDS
  ].filter((keyword) => {
    return !RESERVED_FUNCTIONS.includes(keyword);
  });
  const VARIABLE = {
    scope: "variable",
    match: /@[a-z0-9][a-z0-9_]*/
  };
  const OPERATOR = {
    scope: "operator",
    match: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
    relevance: 0
  };
  const FUNCTION_CALL = {
    match: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
    relevance: 0,
    keywords: { built_in: FUNCTIONS }
  };
  function kws_to_regex(list) {
    return regex.concat(
      /\b/,
      regex.either(...list.map((kw) => {
        return kw.replace(/\s+/, "\\s+");
      })),
      /\b/
    );
  }
  const MULTI_WORD_KEYWORDS = {
    scope: "keyword",
    match: kws_to_regex(COMBOS),
    relevance: 0
  };
  function reduceRelevancy(list, {
    exceptions,
    when
  } = {}) {
    const qualifyFn = when;
    exceptions = exceptions || [];
    return list.map((item) => {
      if (item.match(/\|\d+$/) || exceptions.includes(item)) {
        return item;
      } else if (qualifyFn(item)) {
        return `${item}|0`;
      } else {
        return item;
      }
    });
  }
  return {
    name: "SQL",
    case_insensitive: true,
    // does not include {} or HTML tags `</`
    illegal: /[{}]|<\//,
    keywords: {
      $pattern: /\b[\w\.]+/,
      keyword: reduceRelevancy(KEYWORDS3, { when: (x) => x.length < 3 }),
      literal: LITERALS3,
      type: TYPES3,
      built_in: POSSIBLE_WITHOUT_PARENS
    },
    contains: [
      {
        scope: "type",
        match: kws_to_regex(MULTI_WORD_TYPES)
      },
      MULTI_WORD_KEYWORDS,
      FUNCTION_CALL,
      VARIABLE,
      STRING,
      QUOTED_IDENTIFIER,
      hljs.C_NUMBER_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      COMMENT_MODE,
      OPERATOR
    ]
  };
}

// node_modules/highlight.js/es/languages/plaintext.js
function plaintext(hljs) {
  return {
    name: "Plain text",
    aliases: [
      "text",
      "txt"
    ],
    disableAutodetect: true
  };
}

// src/ui/review-diff.ts
for (const [name, language] of Object.entries({
  typescript,
  javascript: javascript2,
  json,
  css,
  xml,
  python,
  bash,
  yaml,
  sql,
  plaintext
})) {
  core_default.registerLanguage(name, language);
}
function renderReviewDiff(parent, diff) {
  const files = (0, import_diff2html.parse)(diff);
  const toolbar = parent.createDiv({ cls: "linear-prs-diff-toolbar" });
  toolbar.createEl("h3", { text: `Files changed \xB7 ${files.length}` });
  toolbar.createSpan({
    cls: "linear-prs-diff-added",
    text: `+${files.reduce((total, file) => total + file.addedLines, 0)}`
  });
  toolbar.createSpan({
    cls: "linear-prs-diff-deleted",
    text: `\u2212${files.reduce((total, file) => total + file.deletedLines, 0)}`
  });
  let outputFormat = "side-by-side";
  const modes = toolbar.createDiv({
    cls: "linear-prs-control-set linear-prs-diff-modes",
    attr: { role: "group", "aria-label": "Diff layout" }
  });
  if (!files.length) {
    parent.createDiv({
      cls: "linear-prs-empty",
      text: "No changes in this pull request."
    });
    return;
  }
  const layout = parent.createDiv({ cls: "linear-prs-diff-layout" });
  const navigation = layout.createEl("nav", {
    cls: "linear-prs-diff-files",
    attr: { "aria-label": "Changed files" }
  });
  const filter = navigation.createEl("input", {
    cls: "linear-prs-search",
    attr: {
      placeholder: "Filter files\u2026",
      "aria-label": "Filter changed files",
      type: "search"
    }
  });
  const links = navigation.createDiv();
  const changes = layout.createDiv({ cls: "linear-prs-diff-changes" });
  const entries = files.map((file) => {
    const filename = file.isDeleted ? file.oldName : file.newName;
    const card = changes.createEl("details", {
      cls: "linear-prs-diff-file",
      attr: { open: "" }
    });
    const header = card.createEl("summary", { cls: "linear-prs-group-header" });
    createIcon(header, "chevron-down", void 0, "linear-prs-chevron");
    header.createSpan({
      cls: "linear-prs-diff-filename",
      text: filename,
      attr: { title: filename }
    });
    const status = file.isBinary ? "Binary" : file.isRename ? "Renamed" : file.isNew ? "Added" : file.isDeleted ? "Deleted" : "Modified";
    header.createSpan({ cls: "linear-prs-count", text: status });
    header.createSpan({ cls: "linear-prs-diff-added", text: `+${file.addedLines}` });
    header.createSpan({ cls: "linear-prs-diff-deleted", text: `\u2212${file.deletedLines}` });
    const content = card.createDiv({ cls: "linear-prs-diff-editor" });
    let renderedFormat;
    const render = () => {
      if (renderedFormat === outputFormat) {
        return;
      }
      renderedFormat = outputFormat;
      content.empty();
      if (file.isBinary || !file.blocks.length) {
        content.createDiv({
          cls: "linear-prs-empty",
          text: file.isBinary ? "Binary file changed. No text diff is available." : "File renamed or permissions changed; no text changes."
        });
        return;
      }
      new import_diff2html_ui_base.Diff2HtmlUI(
        content,
        [file],
        {
          outputFormat,
          drawFileList: false,
          matching: "lines",
          colorScheme: import_types.ColorSchemeType.LIGHT,
          stickyFileHeaders: false,
          fileContentToggle: false,
          fileListToggle: false,
          highlightLanguages: /* @__PURE__ */ new Map([
            ["tsx", "typescript"],
            ["jsx", "javascript"]
          ])
        },
        core_default
      ).draw();
    };
    const observer = new IntersectionObserver(
      (entries2) => {
        if (entries2.some((entry) => entry.isIntersecting)) {
          render();
          observer.disconnect();
        }
      },
      { root: parent.closest(".linear-prs-diff-scroll"), rootMargin: "400px" }
    );
    observer.observe(card);
    return {
      filename,
      card,
      observer,
      select: () => {
        card.open = true;
        render();
        card.scrollIntoView({ block: "start" });
      },
      changeMode: () => {
        if (renderedFormat) {
          render();
        }
      }
    };
  });
  const filterTree = renderFileTree(links, entries);
  const modeButtons = /* @__PURE__ */ new Map();
  for (const [format, label] of [
    ["line-by-line", "Unified"],
    ["side-by-side", "Split"]
  ]) {
    const button = modes.createEl("button", {
      text: label,
      cls: "linear-prs-diff-mode",
      attr: {
        type: "button",
        "aria-label": `${label} diff`,
        "aria-pressed": String(format === outputFormat)
      }
    });
    button.toggleClass("is-active", format === outputFormat);
    modeButtons.set(format, button);
    button.onclick = () => {
      if (outputFormat === format) {
        return;
      }
      outputFormat = format;
      modeButtons.forEach((modeButton, mode) => {
        modeButton.toggleClass("is-active", mode === format);
        modeButton.setAttr("aria-pressed", String(mode === format));
      });
      entries.forEach((entry) => entry.changeMode());
    };
  }
  filter.oninput = () => {
    filterTree(filter.value);
    for (const entry of entries) {
      const matches = entry.filename.toLowerCase().includes(filter.value.toLowerCase());
      entry.card.hidden = !matches;
    }
  };
  createIconButton(
    toolbar,
    "Collapse all files",
    "fold-vertical",
    () => entries.forEach((entry) => {
      entry.card.open = false;
    })
  );
  createIconButton(
    toolbar,
    "Expand all files",
    "unfold-vertical",
    () => entries.forEach((entry) => {
      entry.card.open = true;
    })
  );
  return () => entries.forEach((entry) => entry.observer.disconnect());
}

// src/api/description-images.ts
var import_obsidian6 = require("obsidian");
function githubImagePaths(source) {
  let url;
  try {
    url = new URL(source);
  } catch {
    return [];
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return [];
  }
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [owner, repository, ...rest] = segments;
  if (!owner || !repository) {
    return [];
  }
  let referenceAndPath;
  if (url.hostname === "github.com" && ["blob", "raw"].includes(rest[0])) {
    referenceAndPath = rest.slice(1);
  } else if (url.hostname === "raw.githubusercontent.com") {
    referenceAndPath = rest;
  } else {
    return [];
  }
  return referenceAndPath.slice(1).map((_, index) => {
    const boundary = index + 1;
    const reference = referenceAndPath.slice(0, boundary).join("/");
    const path = referenceAndPath.slice(boundary).map(encodeURIComponent).join("/");
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}?ref=${encodeURIComponent(reference)}`;
  });
}
async function fetchDescriptionImage(token, source) {
  const paths = githubImagePaths(source);
  for (const path of paths) {
    const response = await (0, import_obsidian6.requestUrl)({
      url: `https://api.github.com${path}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      throw: false
    });
    if (response.status === 404) {
      continue;
    }
    if (response.status >= 400) {
      throw new Error(`GitHub image: ${response.status}`);
    }
    const extension = new URL(source).pathname.split(".").pop()?.toLowerCase();
    const mime = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      avif: "image/avif"
    };
    const contentType = response.headers["content-type"]?.split(";")[0];
    const type = contentType?.startsWith("image/") ? contentType : mime[extension ?? ""];
    if (!type) {
      throw new Error("Unsupported GitHub image format");
    }
    return new Blob([response.arrayBuffer], { type });
  }
  if (paths.length) {
    throw new Error("GitHub image could not be found with the configured credentials");
  }
}

// src/ui/diff-view.ts
var DIFF_VIEW_TYPE = "linear-prs-diff";
var DiffView = class extends import_obsidian7.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  pullRequest;
  controls;
  generation = 0;
  busy = false;
  markdown;
  disposeDiff;
  imageUrls = [];
  getViewType() {
    return DIFF_VIEW_TYPE;
  }
  getDisplayText() {
    return this.pullRequest ? `#${this.pullRequest.number} ${this.pullRequest.title}` : "PR diff";
  }
  getIcon() {
    return "git-pull-request";
  }
  getState() {
    return { pullRequestId: this.pullRequest?.id };
  }
  async setState(state, result) {
    const id = state && typeof state === "object" && "pullRequestId" in state ? state.pullRequestId : void 0;
    this.pullRequest = this.plugin.metadata.pullRequests.find(
      (pullRequest) => pullRequest.id === id
    );
    await super.setState(state, result);
    await this.loadDiff();
  }
  async onClose() {
    this.generation++;
    this.clearContent();
  }
  clearContent() {
    this.disposeDiff?.();
    this.disposeDiff = void 0;
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls = [];
    if (this.markdown) {
      this.removeChild(this.markdown);
      this.markdown = void 0;
    }
  }
  renderControls() {
    const pullRequest = this.pullRequest;
    const controls = this.controls;
    if (!pullRequest || !controls) {
      return;
    }
    controls.empty();
    const archived = this.plugin.metadata.hidden.includes(pullRequest.id);
    const actions = controls.createSpan({ cls: "linear-prs-control-set" });
    const trash = createIconButton(
      actions,
      "Close and remove pull request",
      "trash-2",
      () => void this.runAction(async () => {
        await closePr(this.plugin.credentials(), pullRequest);
        this.plugin.metadata.hidden = [
          .../* @__PURE__ */ new Set([...this.plugin.metadata.hidden, pullRequest.id])
        ];
        await this.plugin.saveMetadata({ refreshBoards: true });
        new import_obsidian7.Notice("Closed and removed PR");
      })
    );
    trash.disabled = this.busy || archived;
    const staging = controls.createSpan({ cls: "linear-prs-control-set" });
    for (const stage of STAGES) {
      const button = createIconButton(
        staging,
        stageTitle(this.plugin.metadata, stage),
        stage,
        () => void this.runAction(async () => {
          const metadata = this.plugin.metadata;
          metadata.reviewTypes[pullRequest.id] = metadata.reviewTypes[pullRequest.id] === stage ? "none" : stage;
          await this.plugin.saveMetadata({ refreshBoards: true });
        }),
        { active: this.plugin.metadata.reviewTypes[pullRequest.id] === stage }
      );
      button.disabled = this.busy;
    }
    renderPullRequestBadges(pullRequest, controls);
    if (archived) {
      controls.createSpan({ text: "Closed and removed" });
    }
  }
  async runAction(action) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.renderControls();
    try {
      await action();
    } catch (error) {
      new import_obsidian7.Notice(errorMessage(error), 8e3);
    } finally {
      this.busy = false;
      this.renderControls();
    }
  }
  async loadImages(description, generation) {
    await forEachConcurrent(
      Array.from(description.querySelectorAll("img")),
      3,
      async (image) => {
        const source = image.getAttribute("src");
        if (!source) {
          return;
        }
        image.referrerPolicy = "no-referrer";
        try {
          const blob = await withDeadline(
            fetchDescriptionImage(this.plugin.settings.githubKey, source),
            3e4,
            "Description image"
          );
          if (!blob || generation !== this.generation) {
            return;
          }
          const url = URL.createObjectURL(blob);
          this.imageUrls.push(url);
          image.src = url;
        } catch (error) {
          if (generation !== this.generation) {
            return;
          }
          image.hidden = true;
          const fallback = description.ownerDocument.createElement("a");
          fallback.textContent = `Open image on GitHub: ${image.alt || "Screenshot"}`;
          fallback.href = source;
          fallback.target = "_blank";
          fallback.rel = "noopener";
          fallback.title = errorMessage(error);
          image.after(fallback);
        }
      }
    );
  }
  async loadDiff() {
    const generation = ++this.generation;
    this.clearContent();
    this.contentEl.empty();
    this.contentEl.addClass("linear-prs", "linear-prs-diff");
    const pullRequest = this.pullRequest;
    if (!pullRequest) {
      this.contentEl.createEl("p", {
        text: "This pull request is no longer in the board. Open it again from the board."
      });
      return;
    }
    const header = this.contentEl.createDiv({ cls: "linear-prs-diff-header" });
    const heading = header.createDiv({ cls: "linear-prs-diff-heading" });
    const title = heading.createDiv({ cls: "linear-prs-title" });
    createIcon(
      title,
      pullRequest.draft ? "git-pull-request-draft" : "git-pull-request",
      void 0,
      pullRequest.draft ? "dim" : "good"
    );
    title.createEl("h2", { text: pullRequest.title });
    this.controls = heading.createDiv({ cls: "linear-prs-actions linear-prs-controls" });
    header.createEl("a", {
      text: `${pullRequest.repo} #${pullRequest.number}`,
      href: pullRequest.url,
      cls: "linear-prs-pill",
      attr: { target: "_blank", rel: "noopener" }
    });
    this.renderControls();
    const body = this.contentEl.createDiv({ cls: "linear-prs-diff-scroll" });
    body.createEl("p", { text: "Loading description and diff\u2026" });
    try {
      const result = await withDeadline(
        fetchPullRequestDiff(this.plugin.settings.githubKey, pullRequest),
        6e4,
        "PR diff"
      );
      if (generation !== this.generation) {
        return;
      }
      body.empty();
      const descriptionCard = body.createEl("details", {
        cls: "linear-prs-diff-description-card",
        attr: { open: "" }
      });
      const summary = descriptionCard.createEl("summary", {
        cls: "linear-prs-group-header"
      });
      createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
      summary.createSpan({ text: "Description", cls: "linear-prs-group-title" });
      const description = descriptionCard.createDiv({
        cls: "linear-prs-diff-description markdown-rendered"
      });
      this.markdown = this.addChild(new import_obsidian7.Component());
      await import_obsidian7.MarkdownRenderer.render(
        this.app,
        result.description || "_No description provided._",
        description,
        "",
        this.markdown
      );
      if (generation !== this.generation) {
        return;
      }
      this.disposeDiff = renderReviewDiff(body, result.diff);
      void this.loadImages(description, generation);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      body.empty();
      body.createEl("p", { text: `Could not load PR diff: ${errorMessage(error)}` });
      const retry = body.createEl("button", { text: "Retry" });
      retry.onclick = () => void this.loadDiff();
    }
  }
};

// src/main.ts
var LinearPrsPlugin = class extends import_obsidian8.Plugin {
  settings = DEFAULT_SETTINGS;
  metadata = createEmptyMetadata();
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    await this.loadMetadata();
    this.registerView(DIFF_VIEW_TYPE, (leaf) => new DiffView(leaf, this));
    this.registerView(BOARD_VIEW_TYPE, (leaf) => new BoardView(leaf, this));
    this.addRibbonIcon("git-pull-request", "Linear PRs", () => void this.openBoard());
    this.addCommand({
      id: "open-linear-prs",
      name: "Open Linear PRs",
      callback: () => void this.openBoard()
    });
    this.addCommand({
      id: "search-pull-requests",
      name: "Search pull requests",
      callback: () => this.app.workspace.getActiveViewOfType(BoardView)?.focusSearch()
    });
    this.addSettingTab(new Preferences(this.app, this));
  }
  async openBoard() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: BOARD_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async openPullRequestDiff(pullRequest) {
    try {
      const leaf = this.app.workspace.openPopoutLeaf();
      await leaf.setViewState({
        type: DIFF_VIEW_TYPE,
        active: true,
        state: { pullRequestId: pullRequest.id }
      });
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      new import_obsidian8.Notice(`Could not open PR diff: ${errorMessage(error)}`, 8e3);
    }
  }
  async loadMetadata() {
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(METADATA_PATH)) {
      try {
        this.metadata = migrateMetadata(JSON.parse(await adapter.read(METADATA_PATH)));
        await this.saveMetadata();
      } catch (e) {
        new import_obsidian8.Notice(`Linear PRs metadata: ${errorMessage(e)}`);
      }
    }
  }
  async saveMetadata(options = {}) {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(".linear-prs")) {
      await adapter.mkdir(".linear-prs");
    }
    await adapter.write(METADATA_PATH, JSON.stringify(this.metadata, null, 2) + "\n");
    if (options.refreshBoards) {
      for (const leaf of this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE)) {
        if (leaf.view instanceof BoardView) {
          leaf.view.render();
        }
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType(DIFF_VIEW_TYPE)) {
      if (leaf.view instanceof DiffView) {
        leaf.view.renderControls();
      }
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  refreshTask = null;
  refresh() {
    if (!this.refreshTask) {
      this.refreshTask = this.refreshBoard().finally(() => {
        this.refreshTask = null;
      });
    }
    return this.refreshTask;
  }
  async refreshBoard() {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error("Enter both API keys in Linear PRs settings.");
    }
    const result = await discover(this.settings);
    const updated = new Set(result.prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => this.metadata.hidden.includes(pullRequest.id) && !updated.has(pullRequest.id)
      )
    ];
    this.metadata.mergeActivity = dailyMerges(result.mergedDates);
    this.metadata.lastRefresh = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveMetadata();
    return result;
  }
  async refreshGroup(groupId) {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error("Enter both API keys in Linear PRs settings.");
    }
    const previous = this.metadata.pullRequests.filter(
      (pullRequest) => pullRequest.groupId === groupId
    );
    const prs = await withDeadline(
      refreshPrs(this.credentials(), previous),
      3e4,
      "Group refresh"
    );
    const result = { prs, errors: [] };
    const updated = new Set(result.prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => !updated.has(pullRequest.id) && (pullRequest.groupId !== groupId || this.metadata.hidden.includes(pullRequest.id))
      )
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshSelectedPrs(prs) {
    if (!this.settings.githubKey) {
      throw new Error("Enter a GitHub API key in Linear PRs settings.");
    }
    const result = await withDeadline(
      refreshPrs(this.credentials(), prs),
      3e4,
      "Pull request refresh"
    );
    const selected = new Set(prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => !selected.has(pullRequest.id)
      )
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshPullRequest(pullRequest) {
    if (!this.settings.githubKey) {
      throw new Error("Enter a GitHub API key in Linear PRs settings.");
    }
    const [snapshot] = await fetchSnapshots(this.settings.githubKey, [pullRequest]);
    const branchUpdate = snapshot.pullRequest ? await rebasePullRequest(
      this.settings.githubKey,
      pullRequest.repo,
      snapshot.remote
    ) : void 0;
    const latest = branchUpdate && branchUpdate.status !== "up-to-date" ? (await fetchSnapshots(this.settings.githubKey, [pullRequest]))[0] : snapshot;
    this.metadata.pullRequests = this.metadata.pullRequests.filter(
      (pr) => pr.id !== pullRequest.id
    );
    if (latest.pullRequest) {
      this.metadata.pullRequests.push(latest.pullRequest);
    }
    await this.saveMetadata();
    return branchUpdate;
  }
  credentials() {
    return { linearKey: this.settings.linearKey, githubKey: this.settings.githubKey };
  }
};
