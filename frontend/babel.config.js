module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-env": {
          targets: { chrome: "90", firefox: "90", safari: "14" },
        },
        "transform-runtime": {
          regenerator: false,
        },
      },
    ],
  ],
};
