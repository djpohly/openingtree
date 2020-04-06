import {simplifiedFen, isDateMoreRecentThan} from './util'
import * as Constants from './Constants'

class OpeningGraph {
    constructor() {
        this.graph=new Graph()
    }
    clear() {
        this.graph = new Graph()
    }
    addGameResultOnFen(fullFen, resultObject) {
        var currNode = this.getNodeFromGraph(fullFen)
        currNode.gameResults.push(resultObject)
    }
    addResultToRoot(resultObject, playerColor) {
        var targetNode = this.getNodeFromGraph(Constants.ROOT_FEN)
        let newDetails = this.getUpdatedMoveDetails(targetNode.details, resultObject, playerColor)
        targetNode.details = newDetails
    }

    getDetailsForFen(fullFen) {
        return this.getNodeFromGraph(simplifiedFen(fullFen)).details
    }

    addMoveForFen(fullSourceFen, fullTargetFen, move, resultObject, playerColor) {
        var targetNode = this.getNodeFromGraph(fullTargetFen)
        let newDetails = this.getUpdatedMoveDetails(targetNode.details, resultObject, playerColor)
        targetNode.details = newDetails

        var currNode = this.getNodeFromGraph(fullSourceFen)
        var movePlayedBy = this.createOrGetMoveNode(currNode.playedBy, move, fullTargetFen)
        currNode.playedByMax = Math.max(currNode.playedByMax, targetNode.details.count)
        currNode.playedBy = movePlayedBy
    }

    getNodeFromGraph(fullFen) {
        let fen = simplifiedFen(fullFen)
        var currNode = this.graph.nodes.get(fen)
        if(!currNode) {
            currNode = new GraphNode()
            currNode.fen = fen
            this.graph.nodes.set(fen, currNode)
        }
        return currNode
    }
    createOrGetMoveNode(movesPlayedNode, move, fullTargetFen){
        var movePlayed = movesPlayedNode.get(move.san)

        if(!movePlayed) {
            movePlayed = new GraphMove()
            movePlayed.move = move
            movePlayed.fen = simplifiedFen(fullTargetFen)
            movesPlayedNode.set(move.san, movePlayed)
        }
        return movesPlayedNode
    }

    getUpdatedMoveDetails(currentMoveDetails, resultObject, playerColor) {
        let whiteWin = 0, blackWin = 0, draw = 0, opponentElo=0, resultInt = 0;
        if(resultObject.result === '1-0') {
            whiteWin = 1
            resultInt = playerColor === 'white'? 1 : -1
        } else if (resultObject.result === '0-1') {
            blackWin = 1
            resultInt = playerColor === 'black'? 1 : -1
        } else {
            draw = 1
        }

        if(playerColor === 'white') {
            opponentElo = resultObject.blackElo
        } else {
            opponentElo = resultObject.whiteElo
        }
        if(resultInt === 1) {
            if(!currentMoveDetails.bestWin || parseInt(opponentElo)>parseInt(currentMoveDetails.bestWin)) {
                currentMoveDetails.bestWin = opponentElo
                currentMoveDetails.bestWinGame = resultObject
            }
        }
        if(resultInt === -1) {
            if(!currentMoveDetails.worstLoss || parseInt(opponentElo)<parseInt(currentMoveDetails.worstLoss)) {
                currentMoveDetails.worstLoss = opponentElo
                currentMoveDetails.worstLossGame = resultObject
            }
        }
        if(!currentMoveDetails.lastPlayedGame || 
            isDateMoreRecentThan(resultObject.date, currentMoveDetails.lastPlayedGame.date)) {
                currentMoveDetails.lastPlayedGame = resultObject
        }
        currentMoveDetails.count += 1
        currentMoveDetails.blackWins += blackWin
        currentMoveDetails.whiteWins += whiteWin
        currentMoveDetails.draws += draw
        currentMoveDetails.totalOpponentElo += parseInt(opponentElo)
        return currentMoveDetails
    }

    gameResultsForFen(fullFen) {
        let fen = simplifiedFen(fullFen)

        var currNode = this.graph.nodes.get(fen)
        if(currNode) {
            return currNode.gameResults
        }
        return null
    }
    movesForFen(fullFen) {
        let fen = simplifiedFen(fullFen)

        var currNode = this.graph.nodes.get(fen)
        if(currNode) {
            return Array.from(currNode.playedBy.entries()).map((entry)=> {
                let gMove = entry[1]
                let targetNode = this.graph.nodes.get(gMove.fen)
                return {
                    orig:gMove.move.from,
                    dest:gMove.move.to,
                    level:this.levelFor(targetNode.details.count, currNode.playedByMax),
                    san:gMove.move.san,
                    details:targetNode.details
                }
            })
        }        
        return null
    }

    levelFor(moveCount, maxCount){
        if(maxCount <= 0 ||moveCount/maxCount > 0.8) {
            return 2
        }
        if(moveCount/maxCount>0.3) {
            return 1
        }
        return 0
    }

}


class Graph {
    nodes = new Map()
}

class GraphNode {
    fen = ''
    playedByMax = 0 // used to keep track of how many times the most frequent move is played for ease of calculation later
    playedBy = new Map()
    gameResults = []
    properties = {}
    details = emptyDetails()
}

class GraphMove {
    fen = ''
    move = {}
}

function emptyDetails() {
    return {
        count: 0,
        blackWins: 0,
        whiteWins: 0,
        draws: 0,
        totalOpponentElo: 0,
        bestWin:null,
        bestWinGame:null,
        worstLoss:null,
        worstLossGame:null,
        lastPlayedGame:null
    }
}

export const openingGraph = new OpeningGraph()