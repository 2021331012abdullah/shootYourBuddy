#include <iostream>
#include <unistd.h>
#include <time.h>
#include <errno.h>
#include <chrono>
#include <math.h>
using namespace std;
using namespace chrono;

int main(int argc, char **argv)
{

    if (argc != 4)
        return -1;
    int moveFrames = stoi(argv[1]) / 15;
    int shootFrames = stoi(argv[2]) / 15;
    int angleDilemma = stoi(argv[3]);

    high_resolution_clock::time_point start = high_resolution_clock::now();
    auto nanos = duration_cast<nanoseconds>(start.time_since_epoch()).count();
    srand(nanos % 2000000000);

    int moveAngle1 = (rand() % 360);
    int moveAngle2 = (rand() % 360);



    int cntMove = 0;
    int cntShoot = 0;

    struct timespec ts;
    ts.tv_sec = 0;
    ts.tv_nsec = 15 * 1000000;
    
    while (1)
    {

        cntMove++;
        if (cntMove == moveFrames)
        {
            cntMove = 0;
            moveAngle1 = (rand() % 360) +(45*(rand()%8));
            moveAngle2 = (rand() % 360) +(45*(rand()%8));
        }
        cout <<"mv" << moveAngle1 <<" " <<moveAngle2 << "\n";
        cout.flush();


        cntShoot++;
        if (cntShoot == shootFrames)
        {
            cntShoot = 0;
            cout <<"sh" <<(rand() % angleDilemma)*(rand()%2 ? 1 :-1) <<" " <<(rand() % angleDilemma)*(rand()%2 ? 1 :-1) <<"\n";
            cout.flush();
        }


        nanosleep(&ts, &ts);
    }

    return 0;
}
